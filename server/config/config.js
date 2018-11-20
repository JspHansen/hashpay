const SERVER_PORT = 3000;

const config = {
  PORT: process.env.PORT || SERVER_PORT,
  PRODUCTION: process.env.NODE_ENV === 'production',
  DATABASE: process.env.NODE_ENV === 'production'
    ? 'mongodb://seng:hashdb_admin@178.62.73.101/hashpaydb'
    : 'mongodb://localhost/hashpaydb',
  STRIPE: {
    PUBLISH_KEY: process.env.NODE_ENV === 'production'
      ? 'pk_test_ZbLym6LFKkbNowX0vXSq5NKH'
      : 'pk_test_ZbLym6LFKkbNowX0vXSq5NKH',
    SECRET_KEY: process.env.NODE_ENV === 'production'
      ? 'sk_test_3NEvIuGkcWmvdauB22t6F3hy'
      : 'sk_test_3NEvIuGkcWmvdauB22t6F3hy'
  }
};

module.exports = config;