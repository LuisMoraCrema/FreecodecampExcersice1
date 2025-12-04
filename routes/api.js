'use strict';
//const fetch = require('node-fetch'); // ya viene instalado en el proyecto
const mongoose = require('mongoose');

// 1. Creamos el modelo de la acción (stock)
const stockSchema = new mongoose.Schema({
  stock: { type: String, required: true, uppercase: true },
  likes: { type: Number, default: 0 },
  ips: [String] // aquí guardaremos las IPs anonimizadas que dieron like
});

const Stock = mongoose.model('Stock', stockSchema);

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(async function (req, res) {
      try {
        // Obtenemos los parámetros de la URL
        const stockParam = req.query.stock;
        const like = req.query.like === 'true'; // si viene ?like=true
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

        // Caso 1: un solo stock (puede ser string o array con 1)
        // Caso 2: dos stocks (viene como array)
        const stocks = Array.isArray(stockParam) ? stockParam : [stockParam];
        if (!stocks[0]) return res.json({ error: 'No stock provided' });

        const results = [];

        for (let symbol of stocks) {
          symbol = symbol.toUpperCase();

          // 1. Obtener precio real usando el proxy de freeCodeCamp
          const priceResponse = await fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`);
          const priceData = await priceResponse.json();

          if (!priceData || !priceData.latestPrice) {
            return res.json({ error: 'Invalid stock symbol or external API error' });
          }

          const price = priceData.latestPrice;

          // 2. Buscar o crear el documento en MongoDB
          let stockDoc = await Stock.findOne({ stock: symbol });

          if (!stockDoc) {
            stockDoc = new Stock({ stock: symbol });
          }

          // 3. Sistema de likes (solo 1 por IP, y anonimizamos la IP)
          if (like) {
            // Anonimizamos la IP (solo guardamos los primeros 3 octetos)
            const anonIp = clientIp.split('.').slice(0, 3).join('.') + '.0';

            if (!stockDoc.ips.includes(anonIp)) {
              stockDoc.likes += 1;
              stockDoc.ips.push(anonIp);
              await stockDoc.save();
            }
          }

          results.push({
            stock: symbol,
            price: price,
            likes: stockDoc.likes
          });
        }

        // Respuesta final
        if (results.length === 1) {
          res.json({
            stockData: {
              stock: results[0].stock,
              price: results[0].price,
              likes: results[0].likes
            }
          });
        } else {
          // Cuando hay 2 stocks, freeCodeCamp pide "rel_likes"
          const relLikes1 = results[0].likes - results[1].likes;
          const relLikes2 = results[1].likes - results[0].likes;

          res.json({
            stockData: [
              { stock: results[0].stock, price: results[0].price, rel_likes: relLikes1 },
              { stock: results[1].stock, price: results[1].price, rel_likes: relLikes2 }
            ]
          });
        }

      } catch (err) {
        console.error(err);
        res.json({ error: 'Error processing request' });
      }
    });

}