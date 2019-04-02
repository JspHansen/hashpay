const SERVER_PORT = 3000;

const config = {
  PORT:       process.env.PORT || SERVER_PORT,
  PRODUCTION: process.env.NODE_ENV === 'production',
  DATABASE:   'mongodb://seng:hashdb_admin@178.62.73.101/hashpaydb',
  STRIPE: {
    PUBLISH_KEY: 'pk_test_ZbLym6LFKkbNowX0vXSq5NKH',
    SECRET_KEY:  'sk_test_3NEvIuGkcWmvdauB22t6F3hy',
    COUNTRY:     'US',
    CURRENCY:    'usd',
    WEB_HOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  }
};

module.exports = config;