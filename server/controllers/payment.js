const mongoose = require('mongoose');
const stripe = require('../config/stripe');
const config = require('../config/config');
const Payment = require('../models/payment');

exports.chargePayment = (req, res) => {
  stripe.charges.create(req.body, (error, charge) => {
    if (error) {
      res.json({ success: false, error: error });
    } else {
      res.json({ success: true, charge: charge });
    }
  });
}

exports.savePayment = (req, res) => {
  const { name, email, amount, tokenId } = req.body;
  if (!name || !email || !amount || !tokenId) {
    return res.json({
      success: false,
      error: { message: 'You must provide an name, email, amount and tokenId' }
    });
  }

  return Payment.findOne({ 'email': email }, (error, payment) => {
    if (error) {
      return res.json({
        success: false,
        error
      });
    }

    if (!payment || typeof payment === undefined) {
      payment = new Payment();
      payment.name = name;
      payment.email = email;
      payment.groupId = 'group01';
      payment.charges = [{
        amount: amount,
        tokenId: tokenId
      }]
      return payment.save((err) => {
        if (err) {
          return res.json({
            success: false,
            error: err
          });
        }
        return res.json({
          success: true
        });
      });
    }

    if (payment.charges.findIndex(charge => charge.tokenId === tokenId) == -1) {
      payment.charges.push({ tokenId: tokenId, amount: amount });
      payment.markModified('charges');
    }

    return payment.save((err) => {
      if (err) {
        return res.json({
          success: false,
          error
        });
      }
      return res.json({
        success: true
      });
    });
  });
};