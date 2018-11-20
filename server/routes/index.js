const express = require('express');
const PaymentController = require('../controllers/payment');
const apiRoutes = express.Router();

const configureRoutes = (app) => {
  apiRoutes.get('/test', PaymentController.testPayment);
  apiRoutes.post('/charge', PaymentController.chargePayment);
  apiRoutes.post('/save-payment', PaymentController.savePayment);
  app.use('/v2', apiRoutes);
};

module.exports = configureRoutes;