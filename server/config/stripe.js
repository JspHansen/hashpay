const configureStripe = require('stripe');
const config = require('./config');

const stripe = configureStripe(config.STRIPE.SECRET_KEY);
module.exports = stripe;