/* ============================================================
   Dar Al Ghuraba Books — Exchange Rate Service
   ============================================================
   Fetches USD→PKR rate from Frankfurter API (free, no key).
   Caches in MongoDB, refreshes every 10 days.
   
   Follows SRP: only responsible for exchange rate logic.
   ============================================================ */
const axios = require('axios');
const ExchangeRate = require('../models/ExchangeRate');

const FRANKFURTER_API = 'https://api.frankfurter.app/latest';
const DEFAULT_REFRESH_DAYS = parseInt(process.env.EXCHANGE_RATE_REFRESH_DAYS, 10) || 10;

/**
 * Get the current USD→PKR exchange rate.
 * Returns cached value if still valid, otherwise fetches fresh.
 * @returns {Promise<{rate: number, fetchedAt: Date, nextRefreshAt: Date}>}
 */
async function getExchangeRate() {
  try {
    // Check for cached rate
    const cached = await ExchangeRate.findOne({
      fromCurrency: 'USD',
      toCurrency: 'PKR',
    }).sort({ fetchedAt: -1 });

    if (cached && cached.nextRefreshAt > new Date()) {
      return {
        rate: cached.rate,
        fetchedAt: cached.fetchedAt,
        nextRefreshAt: cached.nextRefreshAt,
      };
    }

    // Fetch fresh rate
    return await refreshExchangeRate();
  } catch (error) {
    console.error('Exchange rate fetch error:', error.message);
    
    // Fallback: return last known rate if available
    const fallback = await ExchangeRate.findOne({
      fromCurrency: 'USD',
      toCurrency: 'PKR',
    }).sort({ fetchedAt: -1 });

    if (fallback) {
      return {
        rate: fallback.rate,
        fetchedAt: fallback.fetchedAt,
        nextRefreshAt: fallback.nextRefreshAt,
        stale: true,
      };
    }

    // Hard fallback if no rate exists at all
    return {
      rate: 278.50, // Approximate fallback rate
      fetchedAt: new Date(),
      nextRefreshAt: new Date(),
      stale: true,
      fallback: true,
    };
  }
}

/**
 * Force-refresh the exchange rate from Frankfurter API.
 * @returns {Promise<{rate: number, fetchedAt: Date, nextRefreshAt: Date}>}
 */
async function refreshExchangeRate() {
  const response = await axios.get(FRANKFURTER_API, {
    params: { from: 'USD', to: 'PKR' },
    timeout: 10000, // 10s timeout
  });

  const rate = response.data.rates.PKR;
  const now = new Date();
  const nextRefresh = new Date(now.getTime() + DEFAULT_REFRESH_DAYS * 24 * 60 * 60 * 1000);

  // Upsert: update existing or create new
  await ExchangeRate.findOneAndUpdate(
    { fromCurrency: 'USD', toCurrency: 'PKR' },
    {
      rate,
      fetchedAt: now,
      nextRefreshAt: nextRefresh,
    },
    { upsert: true, new: true }
  );

  console.log(`💱 Exchange rate updated: 1 USD = ${rate} PKR (next refresh: ${nextRefresh.toISOString().slice(0, 10)})`);

  return { rate, fetchedAt: now, nextRefreshAt: nextRefresh };
}

module.exports = { getExchangeRate, refreshExchangeRate };
