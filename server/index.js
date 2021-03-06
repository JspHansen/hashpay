const express = require('express');
const mongoose = require('mongoose');

const config = require('./config/config');

const configureServer = require('./server');
const configureRoutes = require('./routes');

const app = express();

mongoose.connect(config.DATABASE, { useNewUrlParser: true });

configureServer(app);
configureRoutes(app);

app.listen(config.PORT, '0.0.0.0', error => {
  if (error) throw error;
  console.log('Server running on port: ' + config.PORT);
});