/* ============================================================
   Dar Al Ghuraba Books — Exchange Rate Model (Mongoose)
   ============================================================
   Caches USD→PKR exchange rate to avoid hitting the API 
   on every request. Refreshes every 10 days.
   ============================================================ */
const mongoose = require('mongoose');

const exchangeRateSchema = new mongoose.Schema(
  {
    fromCurrency: {
      type: String,
      required: true,
      default: 'USD',
      uppercase: true,
    },
    toCurrency: {
      type: String,
      required: true,
      default: 'PKR',
      uppercase: true,
    },
    rate: {
      type: Number,
      required: true,
    },
    fetchedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    nextRefreshAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ExchangeRate', exchangeRateSchema);
