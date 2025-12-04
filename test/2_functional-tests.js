// test/2_functional-tests.js
const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

// Estas dos líneas son OBLIGATORIAS para que el test-runner viejo funcione
const suite = global.suite || describe;
const test = global.test || it;

let likesBefore;

suite('Functional Tests', function () {

  suite('GET /api/stock-prices => stockData object with data', function () {

    test('1. Viewing one stock', function (done) {
      chai.request(server)
        .get('/api/stock-prices')
        .query({ stock: 'AAPL' })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.property(res.body, 'stockData');
          assert.equal(res.body.stockData.stock, 'AAPL');
          assert.propertyVal(res.body.stockData, 'stock', 'AAPL');
          assert.property(res.body.stockData, 'price');
          assert.property(res.body.stockData, 'likes');
          done();
        });
    });

    test('2. Viewing one stock and liking it', function (done) {
      chai.request(server)
        .get('/api/stock-prices')
        .query({ stock: 'GOOG', like: true })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.isAbove(res.body.stockData.likes, 0);
          likesBefore = res.body.stockData.likes;
          done();
        });
    });

    test('3. Viewing the same stock and liking it again', function (done) {
      chai.request(server)
        .get('/api/stock-prices')
        .query({ stock: 'GOOG', like: true })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.body.stockData.likes, likesBefore); // no sube
          done();
        });
    });

    test('4. Viewing two stocks', function (done) {
      chai.request(server)
        .get('/api/stock-prices')
        .query({ stock: ['MSFT', 'AMZN'] })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body.stockData);
          assert.equal(res.body.stockData.length, 2);
          assert.property(res.body.stockData[0], 'rel_likes');
          assert.property(res.body.stockData[1], 'rel_likes');
          done();
        });
    });

    test('5. Viewing two stocks and liking them', function (done) {
      chai.request(server)
        .get('/api/stock-prices')
        .query({ stock: ['TSLA', 'NFLX'], like: true })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body.stockData);
          assert.property(res.body.stockData[0], 'rel_likes');
          assert.property(res.body.stockData[1], 'rel_likes');
          done();
        });
    });

  });
});