const mongoose = require('mongoose'),
      Schema = mongoose.Schema;

const PaymentsSchema = new Schema({
  name: String,
  email: String,
  groupId: String,
  charges : [{
    amount: String,
    tokenId: String,
    createdAt: { type: Date, default: Date.now() }
  }],
}, {
  timestamps: true,
  usePushEach: true
});

module.exports = mongoose.model('Payemnt', PaymentsSchema);
