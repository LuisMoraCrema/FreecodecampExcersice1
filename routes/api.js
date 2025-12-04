'use strict';
const Stock = require('../models/stock');   // ← Esta línea es OBLIGATORIA

module.exports = function (app) {

  app.get('/api/stock-prices', async (req, res) => {
    const { stock, like } = req.query;
    let stocks = [];

    // Normalizar el parámetro stock
    if (typeof stock === 'string') {
      stocks = [stock.toUpperCase()];
    } else if (Array.isArray(stock)) {
      stocks = stock.map(s => s.toUpperCase());
    } else {
      return res.json({ error: 'Stock parameter missing' });
    }

    const ip = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';

    try {
      // Función para obtener o crear un stock en MongoDB
      const processStock = async (symbol) => {
        let stockDoc = await Stock.findOne({ stock: symbol });

        if (!stockDoc) {
          stockDoc = new Stock({
            stock: symbol,
            likes: 0,
            ipLikes: []
          });
        }

        // Si hay like y la IP no ha dado like antes → sumamos
        if (like === 'true' && !stockDoc.ipLikes.includes(ip)) {
          stockDoc.likes += 1;
          stockDoc.ipLikes.push(ip);
          await stockDoc.save();
        }

        return {
          stock: symbol,
          price: Number((Math.random() * 100 + 50).toFixed(2)), // precio simulado
          likes: stockDoc.likes
        };
      };

      // Procesamos todos los stocks (1 o 2)
      const results = await Promise.all(stocks.map(processStock));

      // Respuesta según cantidad de stocks
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
      console.error(err);
      res.json({ error: 'Error processing stock data' });
    }
  });

};