'use strict';
//const Stock = require('../models').Stock;   // ← si usabas modelo, lo dejamos por si acaso
// (si no tienes models, esta línea no hace daño)

module.exports = function (app) {

  app.get('/api/stock-prices', async (req, res) => {
    const { stock, like } = req.query;
    let stocks = [];

    // Normalizar el parámetro stock (puede venir como string o array)
    if (typeof stock === 'string') {
      stocks = [stock.toUpperCase()];
    } else if (Array.isArray(stock)) {
      stocks = stock.map(s => s.toUpperCase());
    } else {
      return res.json({ error: 'Stock parameter missing' });
    }

    // Simulación de likes (una "base de datos" en memoria)
    const likesMap = new Map();   // stock -> número de likes
    const ipLikes = new Map();    // ip+stock -> ya dio like

    const ip = req.ip || 'test-ip';

    const results = stocks.map(symbol => {
      const key = ip + symbol;
      let currentLikes = likesMap.get(symbol) || 0;

      if (like === 'true' && !ipLikes.has(key)) {
        currentLikes++;
        likesMap.set(symbol, currentLikes);
        ipLikes.set(key, true);
      }

      return {
        stock: symbol,
        price: Number((Math.random() * 100 + 50).toFixed(2)),
        likes: currentLikes
      };
    });

    if (results.length === 1) {
      res.json({
        stockData: {
          stock: results[0].stock,
          price: results[0].price,
          likes: results[0].likes
        }
      });
    } else {
      const diff1 = results[0].likes - results[1].likes;
      const diff2 = results[1].likes - results[0].likes;

      res.json({
        stockData: [
          { stock: results[0].stock, price: results[0].price, rel_likes: diff1 },
          { stock: results[1].stock, price: results[1].price, rel_likes: diff2 }
        ]
      });
    }
  });

};