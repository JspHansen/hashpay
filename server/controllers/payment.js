const mongoose = require('mongoose');
const stripe = require('../config/stripe');
const config = require('../config/config');
const Payment = require('../models/payment');

exports.testPayment = (req, res) => {
  res.json({
    message: 'Hello Stripe checkout server!',
    timestamp: new Date().toISOString()
  });
}

exports.readConfig = (req, res) => {
  res.json({
    stripePublishableKey: config.STRIPE.PUBLISH_KEY,
    stripeCurrency: config.STRIPE.CURRENCY,
    stripeCountry: config.STRIPE.COUNTRY,
    options: {
      hidePostalCode: true
    },
    success: true
  });
}

exports.cardPayment = (req, res) => {
  const { status, source } = req.body;
  try {
    if (status === 'pending' || status === 'paid') {
      return res.status(403).json({order, source});
    }
    /* if (source.type === 'card' && !source.livemode) {
      source.id = 'tok_visa';
    } */
    // Pay the order using the Stripe source.
    if (source && source.status === 'chargeable') {
      stripe.charges.create({
        source: source.id,
        amount: source.amount,
        currency: source.currency,
        receipt_email: source.owner.email,
      }
      /* ,{
        idempotency_key: source.id,
      } */
      ).then(response => {
        console.log(response);
        if (response && response.status === 'succeeded') {
          return res.status(200).json({ status: 'paid', source });
        } else if (response) {
          return res.status(200).json({ status: response.status, source });
        } else {
          return res.status(200).json({ status: 'failed', source });
        }
      })
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

exports.webHook = async (req, res) => {
  let data;
  // Check if webhook signing is configured.
  if (config.STRIPE.WEB_HOOK_SECRET) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    let signature = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        config.stripe.webhookSecret
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      return res.sendStatus(400);
    }
    // Extract the object from the event.
    data = event.data;
  } else {
    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
    // retrieve the event data directly from the request body.
    data = req.body.data;
  }
  const object = data.object;

  // Monitor `source.chargeable` events.
  if (
    object.object === 'source' &&
    object.status === 'chargeable' &&
    object.metadata.order
  ) {
    const source = object;
    console.log(`🔔  Webhook received! The source ${source.id} is chargeable.`);
    // Find the corresponding order this source is for by looking in its metadata.
    const order = await orders.retrieve(source.metadata.order);
    // Verify that this order actually needs to be paid.
    if (
      order.metadata.status === 'pending' ||
      order.metadata.status === 'paid' ||
      order.metadata.status === 'failed'
    ) {
      return res.sendStatus(403);
    }

    // Note: We're setting an idempotency key below on the charge creation to
    // prevent any race conditions. It's set to the order ID, which protects us from
    // 2 different sources becoming `chargeable` simultaneously for the same order ID.
    // Depending on your use cases and your idempotency keys, you might need an extra
    // lock surrounding your webhook code to prevent other race conditions.
    // Read more on Stripe's best practices here for asynchronous charge creation:
    // https://stripe.com/docs/sources/best-practices#charge-creation

    // Pay the order using the source we just received.
    let charge, status;
    try {
      charge = await stripe.charges.create(
        {
          source: source.id,
          amount: order.amount,
          currency: order.currency,
          receipt_email: order.email,
        },
        {
          // Set a unique idempotency key based on the order ID.
          // This is to avoid any race conditions with your webhook handler.
          idempotency_key: order.id,
        }
      );
    } catch (err) {
      // This is where you handle declines and errors.
      // For the demo, we simply set the status to mark the order as failed.
      status = 'failed';
    }
    if (charge && charge.status === 'succeeded') {
      status = 'paid';
    } else if (charge) {
      status = charge.status;
    } else {
      status = 'failed';
    }
    // Update the order status based on the charge status.
    await orders.update(order.id, {metadata: {status}});
  }

  // Monitor `charge.succeeded` events.
  if (
    object.object === 'charge' &&
    object.status === 'succeeded' &&
    object.source.metadata.order
  ) {
    const charge = object;
    console.log(`🔔  Webhook received! The charge ${charge.id} succeeded.`);
    // Find the corresponding order this source is for by looking in its metadata.
    const order = await orders.retrieve(charge.source.metadata.order);
    // Update the order status to mark it as paid.
    await orders.update(order.id, {metadata: {status: 'paid'}});
  }

  // Monitor `source.failed`, `source.canceled`, and `charge.failed` events.
  if (
    (object.object === 'source' || object.object === 'charge') &&
    (object.status === 'failed' || object.status === 'canceled')
  ) {
    const source = object.source ? object.source : object;
    console.log(`🔔  Webhook received! Failure for ${object.id}.`);
    if (source.metadata.order) {
      // Find the corresponding order this source is for by looking in its metadata.
      const order = await orders.retrieve(source.metadata.order);
      // Update the order status to mark it as failed.
      await orders.update(order.id, {metadata: {status: 'failed'}});
    }
  }

  // Return a 200 success code to Stripe.
  res.sendStatus(200);
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