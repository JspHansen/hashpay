const express = require('express');
const PaymentController = require('../controllers/payment');
const apiRoutes = express.Router();

const configureRoutes = (app) => {
  apiRoutes.get('/test',          PaymentController.testPayment);
  apiRoutes.get('/config',        PaymentController.readConfig);
  apiRoutes.post('/card-payment', PaymentController.cardPayment);
  apiRoutes.post('/save-payment', PaymentController.savePayment);
  app.use('/v2', apiRoutes);
};

module.exports = configureRoutes;