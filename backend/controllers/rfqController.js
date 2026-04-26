const { pool } = require('../config/db');
const { getIo } = require('../services/socketService');

const calculateTotalCost = (freight, origin, destination) => {
    return parseFloat(freight) + parseFloat(origin) + parseFloat(destination);
};

const logActivity = async (databaseClient, rfqId, activityMessage, eventType) => {
    await databaseClient.query(
        'INSERT INTO activity_logs (rfq_id, message, type) VALUES ($1, $2, $3)',
        [rfqId, activityMessage, eventType]
    );
    const io = getIo();
    io.to(`rfq_${rfqId}`).emit('activity_log_updated', { message: activityMessage, type: eventType, timestamp: new Date() });
};

const getAllRfqs = async (request, response) => {
    try {
        const allRfqsQuery = await pool.query('SELECT * FROM rfqs ORDER BY id DESC');
        
        const rfqsWithLowestBid = await Promise.all(allRfqsQuery.rows.map(async (rfqRecord) => {
            const lowestBidQuery = await pool.query('SELECT MIN(total_cost) as lowest_bid FROM bids WHERE rfq_id = $1', [rfqRecord.id]);
            return {
                ...rfqRecord,
                lowest_bid: lowestBidQuery.rows[0].lowest_bid
            };
        }));
        
        response.json(rfqsWithLowestBid);
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: 'Internal server error' });
    }
};

const createRfq = async (request, response) => {
    const { name, bid_start_time, bid_close_time, forced_bid_close_time, trigger_window_minutes, extension_duration_minutes, extension_type, pickup_date } = request.body;
    try {
        const newlyCreatedRfq = await pool.query(
            `INSERT INTO rfqs 
            (name, bid_start_time, bid_close_time, forced_bid_close_time, trigger_window_minutes, extension_duration_minutes, extension_type, pickup_date) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [name, bid_start_time, bid_close_time, forced_bid_close_time, trigger_window_minutes, extension_duration_minutes, extension_type, pickup_date]
        );
        response.status(201).json(newlyCreatedRfq.rows[0]);
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: 'Internal server error' });
    }
};

const getRfqDetails = async (request, response) => {
    const { id: rfqId } = request.params;
    try {
        const targetRfqQuery = await pool.query('SELECT * FROM rfqs WHERE id = $1', [rfqId]);
        if (targetRfqQuery.rowCount === 0) return response.status(404).json({ error: 'RFQ not found' });
        
        const rfqDetails = targetRfqQuery.rows[0];

        const relatedBidsQuery = await pool.query(`
            SELECT b.*, s.name as supplier_name 
            FROM bids b 
            JOIN suppliers s ON b.supplier_id = s.id 
            WHERE rfq_id = $1 
            ORDER BY b.total_cost ASC, b.created_at ASC
        `, [rfqId]);

        const activityLogsQuery = await pool.query('SELECT * FROM activity_logs WHERE rfq_id = $1 ORDER BY timestamp DESC', [rfqId]);

        response.json({
            ...rfqDetails,
            bids: relatedBidsQuery.rows,
            activity_logs: activityLogsQuery.rows
        });
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: 'Internal server error' });
    }
};

const submitBid = async (request, response) => {
    const { id: targetRfqId } = request.params;
    const { supplier_id, freight_charges, origin_charges, destination_charges, transit_time, quote_validity } = request.body;
    
    const databaseTransactionClient = await pool.connect();
    try {
        await databaseTransactionClient.query('BEGIN');
        
        // 1. Get RFQ details and lock the row for update to prevent race conditions
        const activeRfqQuery = await databaseTransactionClient.query('SELECT * FROM rfqs WHERE id = $1 FOR UPDATE', [targetRfqId]);
        if (activeRfqQuery.rowCount === 0) throw new Error('RFQ not found');
        const activeRfq = activeRfqQuery.rows[0];

        const currentTimestamp = new Date();
        const auctionEndTime = new Date(activeRfq.bid_close_time);
        const absoluteMaxEndTime = new Date(activeRfq.forced_bid_close_time);

        // Check if auction is closed
        if (currentTimestamp > auctionEndTime) {
            throw new Error('Auction is closed');
        }

        // Calculate total cost
        const calculatedTotalCost = calculateTotalCost(freight_charges, origin_charges, destination_charges);

        // Get current bids to check rank and lowest bidder (L1) before inserting new bid
        const existingBidsQuery = await databaseTransactionClient.query('SELECT * FROM bids WHERE rfq_id = $1 ORDER BY total_cost ASC, created_at ASC', [targetRfqId]);
        const existingBidsList = existingBidsQuery.rows;
        
        let previousLowestBidder = existingBidsList.length > 0 ? existingBidsList[0] : null;
        let previousSupplierRank = -1;
        
        // Check if this supplier already had a bid
        const previousBidIndexForSupplier = existingBidsList.findIndex(bid => bid.supplier_id === parseInt(supplier_id));
        if (previousBidIndexForSupplier !== -1) {
            previousSupplierRank = previousBidIndexForSupplier + 1; // 1-based rank
        }

        // Insert new bid
        const insertedBidQuery = await databaseTransactionClient.query(
            `INSERT INTO bids (rfq_id, supplier_id, freight_charges, origin_charges, destination_charges, transit_time, quote_validity, total_cost) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [targetRfqId, supplier_id, freight_charges, origin_charges, destination_charges, transit_time, quote_validity, calculatedTotalCost]
        );
        const newlyInsertedBid = insertedBidQuery.rows[0];

        // Get updated bids to determine new rank and new lowest bidder (L1)
        const bidsAfterInsertQuery = await databaseTransactionClient.query('SELECT * FROM bids WHERE rfq_id = $1 ORDER BY total_cost ASC, created_at ASC', [targetRfqId]);
        const updatedBidsList = bidsAfterInsertQuery.rows;
        
        const newLowestBidder = updatedBidsList[0];
        const newBidIndexForSupplier = updatedBidsList.findIndex(bid => bid.id === newlyInsertedBid.id);
        const newSupplierRank = newBidIndexForSupplier + 1;

        // Log bid submission
        const supplierInfoQuery = await databaseTransactionClient.query('SELECT name FROM suppliers WHERE id = $1', [supplier_id]);
        const submittingSupplierName = supplierInfoQuery.rows[0].name;
        await logActivity(databaseTransactionClient, targetRfqId, `Bid submitted by ${submittingSupplierName} for total cost: ${calculatedTotalCost}`, 'BID_SUBMITTED');

        // AUCTION EXTENSION LOGIC
        const timeRemainingMilliseconds = auctionEndTime.getTime() - currentTimestamp.getTime();
        const triggerWindowMilliseconds = activeRfq.trigger_window_minutes * 60 * 1000;

        const webSocketIo = getIo();

        if (timeRemainingMilliseconds <= triggerWindowMilliseconds && auctionEndTime < absoluteMaxEndTime) {
            let requiresExtension = false;

            if (activeRfq.extension_type === 'BID_RECEIVED') {
                requiresExtension = true;
                await logActivity(databaseTransactionClient, targetRfqId, `Auction extended due to bid received within trigger window.`, 'EXTENSION');
            } 
            else if (activeRfq.extension_type === 'RANK_CHANGE') {
                if (previousSupplierRank !== newSupplierRank) {
                    requiresExtension = true;
                    await logActivity(databaseTransactionClient, targetRfqId, `Auction extended due to rank change within trigger window.`, 'EXTENSION');
                }
            } 
            else if (activeRfq.extension_type === 'L1_CHANGE') {
                if (!previousLowestBidder || newLowestBidder.id !== previousLowestBidder.id) {
                    requiresExtension = true;
                    await logActivity(databaseTransactionClient, targetRfqId, `Auction extended due to L1 change within trigger window.`, 'EXTENSION');
                }
            }

            if (requiresExtension) {
                let calculatedNewCloseTime = new Date(auctionEndTime.getTime() + (activeRfq.extension_duration_minutes * 60 * 1000));
                
                if (calculatedNewCloseTime > absoluteMaxEndTime) {
                    calculatedNewCloseTime = absoluteMaxEndTime;
                }

                await databaseTransactionClient.query('UPDATE rfqs SET bid_close_time = $1 WHERE id = $2', [calculatedNewCloseTime, targetRfqId]);
                
                webSocketIo.to(`rfq_${targetRfqId}`).emit('auction_extended', { new_close_time: calculatedNewCloseTime });
            }
        }

        await databaseTransactionClient.query('COMMIT');

        webSocketIo.to(`rfq_${targetRfqId}`).emit('new_bid', { ...newlyInsertedBid, supplier_name: submittingSupplierName });
        webSocketIo.to(`rfq_${targetRfqId}`).emit('bids_updated');

        response.status(201).json(newlyInsertedBid);
    } catch (error) {
        await databaseTransactionClient.query('ROLLBACK');
        console.error(error);
        response.status(400).json({ error: error.message });
    } finally {
        databaseTransactionClient.release();
    }
};

module.exports = {
    getAllRfqs,
    createRfq,
    getRfqDetails,
    submitBid
};
