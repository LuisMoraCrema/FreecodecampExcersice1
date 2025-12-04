'use strict';
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner');

const app = express();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],   // necesario por el inline CSS de FCC
      imgSrc: ["'self'", "data:"],
    }
  }
}));
app.use('/public', express.static(process.cwd() + '/public'));
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Página principal
app.route('/').get(function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Para pruebas de FCC
fccTestingRoutes(app);

// Conexión a MongoDB Atlas
console.log('Intentando conectar a:', process.env.MONGO_URI ? 'URI encontrada' : 'NO HAY URI'); // ← Esto te dice si lo está leyendo

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('¡MongoDB conectado correctamente!'))
  .catch(err => console.log('Error de conexión a MongoDB:', err.message));

// Rutas de la API
apiRoutes(app);

// 404
app.use(function (req, res, next) {
  res.status(404).type('text').send('Not Found');
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
  console.log('Your app is listening on port ' + PORT);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (e) {
        console.log('Tests are not valid:');
        console.error(e);
      }
    }, 3500);
  }
});

module.exports = app;