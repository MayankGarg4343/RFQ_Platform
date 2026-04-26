const { pool } = require('../config/db');

const getSuppliers = async (request, response) => {
    try {
        const allSuppliersQuery = await pool.query('SELECT * FROM suppliers');
        response.json(allSuppliersQuery.rows);
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getSuppliers
};
