const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const { initSocket } = require('./services/socketService');
const rfqRoutes = require('./routes/rfqRoutes');
const supplierRoutes = require('./routes/supplierRoutes');

const expressApplication = express();
expressApplication.use(cors());
expressApplication.use(express.json());

const httpServer = http.createServer(expressApplication);



initSocket(httpServer);



expressApplication.use('/api/rfqs', rfqRoutes);
expressApplication.use('/api/suppliers', supplierRoutes);

const serverPort = process.env.PORT || 5000;
httpServer.listen(serverPort, () => {
    console.log(`Server listening on port ${serverPort}`);
});
