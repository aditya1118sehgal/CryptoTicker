'use strict';


var express = require('express');
var http = require('http');
var https = require('https');
var io = require('socket.io');
var cors = require('cors');
var logger = require('morgan');
var colors = require('colors'); //logging with colors

var endpoints = require('./common/endpoints');
var config = require('./common/config');
var helpers = require('./common/helpers');

var PORT = config.PORT;

var logBlue = helpers.logBlue;
var logGreen = helpers.logGreen;
var logMagenta = helpers.logMagenta;
var logYellow = helpers.logYellow;
var logRed = helpers.logRed;

var TICK_FREQUENCY = 100;
var PRETTIFY_JSON = true;

/**
 * gets ETH price
 * @param socket
 * @param ticker
 */
var getPriceETH = function(socket, ticker) {
  var price;
  var url = endpoints.URI_ETH;
  getPrice(url, function(price) {
    //logMagenta('got eth price = ['+price+'], emitting');
    socket.emit(ticker, price);
  });
};

/**
 * gets LTC price
 * @param socket
 * @param ticker
 */
var getPriceLTC = function(socket, ticker) {
  var price;
  var url = endpoints.URI_LTC;
  getPrice(url, function(price) {
    //logYellow('got ltc price = ['+price+'], emitting');
    if(price != null) {
      socket.emit(ticker, price);
    }

  });
};

/**
  * performs a GET request and returns the data
  * @param url
*/
var getPrice = function(url, callback) {
  var msg = '';
  var price = undefined;
  https.get(url, function(response) {
      response.setEncoding('utf8');
      var data = '';

      response.on('data', function(chunk) {
          data += chunk;
      });
      response.on('end', function() {
          if(data.length > 0) {
              var dataObj;
              try {
                  dataObj = JSON.parse(data);
                  price = dataObj[0]['price_usd'];
                  callback(price);
              }
              catch(e) {
                  logRed(e);
                  callback(null);
              }
          }

      });
      response.on('error', function(error){
          logRed("Error: " + error);
          callback(null);
      });
  });
}

/**
 * ticker ETH
 * @param socket
 * @param ticker
 */
var tickETH = function(socket, ticker) {
    logMagenta('ETH ticking...');

    getPriceETH(socket, ticker);
    var timer = setInterval(function() {
        getPriceETH(socket, ticker);
    }, TICK_FREQUENCY);

    socket.on('disconnect', function () {
        clearInterval(timer);
    });
}

/**
 * ticker LTC
 * @param socket
 * @param ticker
 */
var tickLTC = function(socket, ticker) {
    logYellow('LTC ticking...');

    getPriceLTC(socket, ticker);

    var timer = setInterval(function() {
        getPriceLTC(socket, ticker);
    }, TICK_FREQUENCY);

    socket.on('disconnect', function () {
        clearInterval(timer);
    });
}

var app = express();
app.use(cors());
app.use(logger('dev'));
var server = http.createServer(app);

var io = io.listen(server);
io.set('origins', '*:*');

app.get('/', function(req, res) {
  var msg = 'sendig index';
  logBlue(msg);
  var PATH = '/web/index.html'
  res.sendfile(__dirname + PATH);
});

io.sockets.on('connection', function(socket) {
    // turn on:
    // 1. eth socket
    socket.on('tickerETH', function(ticker) {
      //logMagenta('ETH socket on');
      tickETH(socket, ticker);
    });
    //2. ltc socket
    socket.on('tickerLTC', function(ticker) {
      //logYellow('LTC socket on');
      tickLTC(socket, ticker);
    });
});

server.listen(PORT, function() {
  var msg = 'server listening on port = ['+PORT+']';
  console.log('************************************')
  logGreen(msg);
});

//color codes:
// server = green
// eth = magenta
// ltc = yellow
// err = red
