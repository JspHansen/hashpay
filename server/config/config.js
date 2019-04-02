const SERVER_PORT = 3000;

const config = {
  PORT:       process.env.PORT || SERVER_PORT,
  PRODUCTION: process.env.NODE_ENV === 'production',
  DATABASE:   'mongodb://localhost/hashpaydb',
  STRIPE: {
    PUBLISH_KEY: '',
    SECRET_KEY:  '',
    COUNTRY:     'US',
    CURRENCY:    'usd',
    WEB_HOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  }
};

module.exports = config;