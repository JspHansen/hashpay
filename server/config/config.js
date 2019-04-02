const SERVER_PORT = 3000;

const config = {
  PORT: process.env.PORT || SERVER_PORT,
  PRODUCTION: process.env.NODE_ENV === 'production',
  DATABASE: process.env.NODE_ENV === 'production'
    ? ''
    : 'mongodb://localhost/hashpaydb',
  STRIPE: {
    PUBLISH_KEY: process.env.NODE_ENV === 'production'
      ? 'pk_test_xxx'
      : 'pk_test_xxx',
    SECRET_KEY: process.env.NODE_ENV === 'production'
      ? 'pk_test_xxx'
      : 'pk_test_xxx'
  }
};

module.exports = config;