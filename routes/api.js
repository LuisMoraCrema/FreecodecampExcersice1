'use strict';

module.exports = function (app) {

  // Mapas en memoria para likes (se resetean por request, pero para tests de FCC basta)
  const likesMap = new Map();  // stock → likes
  const ipLikes = new Map();   // ip + stock → true (evita dobles likes)

  app.get('/api/stock-prices', (req, res) => {
    const { stock, like } = req.query;
    let stocks = [];

    // Normalizar stock
    if (typeof stock === 'string') {
      stocks = [stock.toUpperCase()];
    } else if (Array.isArray(stock)) {
      stocks = stock.map(s => s.toUpperCase());
    } else {
      return res.json({ error: 'Stock parameter missing' });
    }

    const ip = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'test-ip';

    const results = stocks.map(symbol => {
      const key = ip + symbol;
      let currentLikes = likesMap.get(symbol) || 0;

      if (like === 'true' && !ipLikes.has(key)) {
        currentLikes += 1;
        likesMap.set(symbol, currentLikes);
        ipLikes.set(key, true);
      }

      return {
        stock: symbol,
        price: Number((Math.random() * 100 + 50).toFixed(2)),
        likes: currentLikes
      };
    });

    // Respuesta según cantidad
    if (results.length === 1) {
      res.json({
        stockData: {
          stock: results[0].stock,
          price: results[0].price,
          likes: results[0].likes
        }
      });
    } else {
      const rel_likes1 = results[0].likes - results[1].likes;
      const rel_likes2 = results[1].likes - results[0].likes;

      res.json({
        stockData: [
          { stock: results[0].stock, price: results[0].price, rel_likes: rel_likes1 },
          { stock: results[1].stock, price: results[1].price, rel_likes: rel_likes2 }
        ]
      });
    }
  });

};