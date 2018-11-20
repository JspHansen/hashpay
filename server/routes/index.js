const express = require('express');
const PaymentController = require('../controllers/payment');
const apiRoutes = express.Router();

const configureRoutes = (app) => {
  apiRoutes.post('/charge', PaymentController.chargePayment);
  apiRoutes.post('/save-payment', PaymentController.savePayment);
  app.use('/api', apiRoutes);
};

module.exports = configureRoutes;