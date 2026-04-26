const express = require('express');
const router = express.Router();
const rfqController = require('../controllers/rfqController');

router.get('/', rfqController.getAllRfqs);
router.post('/', rfqController.createRfq);
router.get('/:id', rfqController.getRfqDetails);
router.post('/:id/bids', rfqController.submitBid);

module.exports = router;
