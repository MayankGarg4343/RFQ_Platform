const { Client } = require('pg');
const { dbConfig } = require('./config/db');

async function initializeDatabase() {

    const postgresSystemClient = new Client({
        user: dbConfig.user,
        host: dbConfig.host,
        database: 'postgres',
        password: dbConfig.password,
        port: dbConfig.port,
    });

    try {
        await postgresSystemClient.connect();
        

        const databaseExistsQuery = await postgresSystemClient.query("SELECT 1 FROM pg_database WHERE datname = 'rfq_system'");
        if (databaseExistsQuery.rowCount === 0) {
            console.log("Database 'rfq_system' not found, creating it...");
            await postgresSystemClient.query("CREATE DATABASE rfq_system");
            console.log("Database 'rfq_system' created successfully.");
        } else {
            console.log("Database 'rfq_system' already exists.");
        }
    } catch (error) {
        console.error("Error creating database:", error);
    } finally {
        await postgresSystemClient.end();
    }


    const rfqDatabaseClient = new Client(dbConfig);
    try {
        await rfqDatabaseClient.connect();
        
        console.log("Creating tables...");

        await rfqDatabaseClient.query(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL
            );
        `);

        await rfqDatabaseClient.query(`
            CREATE TABLE IF NOT EXISTS rfqs (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                bid_start_time TIMESTAMP NOT NULL,
                bid_close_time TIMESTAMP NOT NULL,
                forced_bid_close_time TIMESTAMP NOT NULL,
                trigger_window_minutes INTEGER NOT NULL,
                extension_duration_minutes INTEGER NOT NULL,
                extension_type VARCHAR(50) NOT NULL,
                pickup_date DATE,
                status VARCHAR(50) DEFAULT 'ACTIVE'
            );
        `);

        await rfqDatabaseClient.query(`
            CREATE TABLE IF NOT EXISTS bids (
                id SERIAL PRIMARY KEY,
                rfq_id INTEGER REFERENCES rfqs(id) ON DELETE CASCADE,
                supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
                freight_charges DECIMAL(10, 2) NOT NULL,
                origin_charges DECIMAL(10, 2) NOT NULL,
                destination_charges DECIMAL(10, 2) NOT NULL,
                transit_time VARCHAR(100),
                quote_validity VARCHAR(100),
                total_cost DECIMAL(10, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await rfqDatabaseClient.query(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id SERIAL PRIMARY KEY,
                rfq_id INTEGER REFERENCES rfqs(id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                type VARCHAR(50) NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);


        const existingSuppliersQuery = await rfqDatabaseClient.query("SELECT COUNT(*) FROM suppliers");
        if (parseInt(existingSuppliersQuery.rows[0].count) === 0) {
            console.log("Seeding dummy suppliers...");
            await rfqDatabaseClient.query(`
                INSERT INTO suppliers (name) VALUES 
                ('Supplier A'),
                ('Supplier B'),
                ('Supplier C'),
                ('Supplier D')
            `);
        }

        console.log("Database initialization complete!");

    } catch (error) {
        console.error("Error initializing database tables:", error);
    } finally {
        await rfqDatabaseClient.end();
    }
}

initializeDatabase();
