'use strict';
const fetch = global.fetch || require('node-fetch');
const mongoose = require('mongoose');

// Modelo de Stock
const stockSchema = new mongoose.Schema({
  stock: { type: String, required: true, uppercase: true, unique: true },
  likes: { type: Number, default: 0 },
  ips: [String] // IPs anonimizadas
});
const Stock = mongoose.model('Stock', stockSchema);

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(async function (req, res) {
      try {
        let { stock, like } = req.query;
        const likeFlag = like === 'true' || like === true;

        // IP del cliente
        const ip = req.ip || req.connection?.remoteAddress || '::1';

        // ========== NORMALIZAR stock ==========
        let stocks = [];

        if (typeof stock === 'string' && stock.includes(',')) {
          stocks = stock.split(',').map(s => s.trim().toUpperCase());
        } else if (typeof stock === 'string') {
          stocks = [stock.toUpperCase()];
        } else if (Array.isArray(stock)) {
          stocks = stock.map(s => s.toUpperCase());
        } else {
          return res.json({ error: 'No stock provided' });
        }

        if (stocks.length === 0 || stocks.length > 2) {
          return res.json({ error: 'Invalid stock parameter' });
        }

        const results = [];

        for (const symbol of stocks) {
          // 1. Precio real del proxy oficial de freeCodeCamp
          const response = await fetch(
            `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`
          );
          const data = await response.json();

          if (!data?.latestPrice) {
            return res.json({ error: 'Invalid symbol or API error' });
          }

          // 2. Buscar/crear en MongoDB
          let stockDoc = await Stock.findOne({ stock: symbol });
          if (!stockDoc) {
            stockDoc = new Stock({ stock: symbol });
          }

          // 3. Likes + anonimato IP
          if (likeFlag) {
            const anonIp = ip.includes(':') 
              ? ip.split(':').slice(0, 3).join(':') + ':0' 
              : ip.split('.').slice(0, 3).join('.') + '.0';

            if (!stockDoc.ips.includes(anonIp)) {
              stockDoc.likes += 1;
              stockDoc.ips.push(anonIp);
              await stockDoc.save();
            }
          }

          results.push({
            stock: symbol,
            price: data.latestPrice,
            likes: stockDoc.likes
          });
        }

        // ========== RESPUESTA FINAL ==========
        if (results.length === 1) {
          res.json({
            stockData: {
              stock: results[0].stock,
              price: results[0].price,
              likes: results[0].likes
            }
          });
        } else {
          const rel1 = results[0].likes - results[1].likes;
          const rel2 = results[1].likes - results[0].likes;

          res.json({
            stockData: [
              { stock: results[0].stock, price: results[0].price, rel_likes: rel1 },
              { stock: results[1].stock, price: results[1].price, rel_likes: rel2 }
            ]
          });
        }

      } catch (err) {
        console.error('Error:', err);
        res.json({ error: 'Server error' });
      }
    });
};