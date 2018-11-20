const cors = require('cors');
const bodyParser = require('body-parser');

const configureServer = app => {
  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ 'extended': 'false' }));
};

module.exports = configureServer;