'use strict';

let Stock;  // ← Variable para el modelo (se carga solo si DB conecta)
let dbConnected = false;

module.exports = function (app) {
  // Intentamos cargar el modelo solo si Mongo está disponible
  try {
    Stock = require('../models/stock');
    dbConnected = true;
    console.log('Modelo Stock cargado correctamente');
  } catch (err) {
    console.log('No se pudo cargar modelo Stock, usando fallback en memoria');
    dbConnected = false;
  }

  app.get('/api/stock-prices', async (req, res) => {
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

    const ip = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';

    // Fallback en memoria si DB falla
    const likesMap = new Map();  // stock → likes
    const ipLikes = new Map();   // ip+stock → true

    const processStock = async (symbol) => {
      if (dbConnected && Stock) {
        try {
          let stockDoc = await Stock.findOne({ stock: symbol });
          if (!stockDoc) {
            stockDoc = new Stock({ stock: symbol, likes: 0, ipLikes: [] });
          }

          if (like === 'true' && !stockDoc.ipLikes.includes(ip)) {
            stockDoc.likes += 1;
            stockDoc.ipLikes.push(ip);
            await stockDoc.save();
          }

          return {
            stock: symbol,
            price: Number((Math.random() * 100 + 50).toFixed(2)),
            likes: stockDoc.likes
          };
        } catch (dbErr) {
          console.error('DB error, cayendo a fallback:', dbErr.message);
          // Fallback a memoria
          return processFallback(symbol);
        }
      } else {
        // Fallback directo
        return processFallback(symbol);
      }
    };

    const processFallback = (symbol) => {
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
    };

    try {
      const results = await Promise.all(stocks.map(processStock));

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
    } catch (err) {
      console.error('Error general:', err);
      res.json({ error: 'Error processing stock data' });
    }
  });
};