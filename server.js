'use strict';


var express = require('express');
var http = require('http');
var https = require('https');
var io = require('socket.io');
var cors = require('cors');
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
var ETH_AMOUNT = 1;
var LTC_AMOUNT = 1;
var currETH = -1;
var currLTC = -1;
var currALL = -1;
var ETH_PRICE;
var LTC_PRICE;



var tickETH = function(socket, ticker) {
  var msg = 'in getPriceETH';
  var price;
  var url = endpoints.URI_ETH;
  getPrice(url, function(price) {
    logMagenta('got eth price = ['+price+'], emitting');
    socket.emit(ticker, price);
  });
};

var tickLTC = function(socket, ticker) {
  var msg = 'in getPriceETH';
  var price;
  var url = endpoints.URI_LTC;
  getPrice(url, function(price) {
    logYellow('got ltc price = ['+price+'], emitting');
    socket.emit(ticker, price);
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
              } catch(e) {
                  callback(price);
                  logRed(e);
              }
          }

      });
  });
}

function getPrices(socket, ticker) {
  console.log('in getPrices');
  getPriceETH(function(price){
    var emitETH = ETH_AMOUNT*price;
    logGreen('eth price = '+emitETH);
  });
    /*https.get('https://api.coinmarketcap.com/v1/ticker/litecoin/'
    , function(response) {
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
                    LTC_PRICE = dataObj[0]['price_usd']
                } catch(e) {
                    return false;
                }
            }
            var emitETH = ETH_AMOUNT*ETH_PRICE;
            var emitLTC = LTC_AMOUNT*LTC_PRICE;
            var emitALL = emitLTC+emitETH;
            var ethStr = '';
            var ltcStr = '';
            var allStr = '';
            var toEmit = false;
            if(currALL > emitALL) {
              allStr = 'ALL = ' + emitALL + ':-';
              currALL = emitALL;
              toEmit = true;
              console.log('ALL ' +currALL+ '->'+emitALL + ' :()');
            }
            else {
              if(currALL === emitALL) {
                allStr = 'ALL = ' + emitALL + ':0';
              }
              else {
                allStr = 'ALL = ' + emitALL + ':+';
                toEmit = true;
                console.log('ALL ' +currALL+ '->'+emitALL + ' :)');
              }
              currALL = emitALL;
            }
            if(currETH > emitETH) {
              ethStr = 'ETH = ' + emitETH + ':-';
              currETH = emitETH;
              toEmit = true;
              console.log('ETH ' +currALL+ '->'+emitETH + ' :(');
            }
            else {
              if(currETH === emitETH) {
                ethStr = 'ETH = ' + emitETH + ':0';
              }
              else {
                ethStr = 'ETH = ' + emitETH + ':+';
                toEmit = true;
                console.log('ETH ' +currALL+ '->'+emitETH + ' :)');

              }
              currETH = emitETH;
            }
            if(currLTC > emitLTC) {
              ltcStr = 'LTC = ' + emitLTC + ':-';
              currLTC = emitLTC;
              toEmit = true;
              console.log('LTC ' +currLTC+ '->'+ emitLTC + ' :(');
            }
            else {
              if(currLTC === emitLTC) {
                ltcStr = 'LTC = ' + emitLTC + ':0';
              }
              else {
                ltcStr = 'LTC = ' + emitLTC + ':+';
                toEmit = true;
                console.log('LTC ' +currLTC+ '->'+ emitLTC + ' :)');
              }
              currLTC = emitLTC;
            }
            if(toEmit) {
              socket.emit(ticker, ltcStr);
              socket.emit(ticker, ethStr);
              socket.emit(ticker, allStr);
            }
        });
    });*/
}

function tickETH(socket, ticker) {
  getPriceETH(socket, ticker);
    logBlue('ticking');
    var timer = setInterval(function() {
        getPriceETH(socket, ticker);
    }, TICK_FREQUENCY);

    socket.on('disconnect', function () {
        clearInterval(timer);
    });
}

function tickLTC(socket, ticker) {

  getPriceLTC(socket, ticker);
    logYellow('ticking');
    var timer = setInterval(function() {
        getPriceLTC(socket, ticker);
    }, TICK_FREQUENCY);

    socket.on('disconnect', function () {
        clearInterval(timer);
    });
}


function trackTicker(socket, ticker) {
    getPrices(socket, ticker);
    console.log('in track');
    var timer = setInterval(function() {
        getPrices(socket, ticker);
    }, TICK_FREQUENCY);

    socket.on('disconnect', function () {
        clearInterval(timer);
    });
}

var app = express();
app.use(cors());
var server = http.createServer(app);

var io = io.listen(server);
io.set('origins', '*:*');

app.get('/', function(req, res) {
  var msg = 'sendig index';
  logBlue(msg);
  res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function(socket) {
    /*socket.on('ticker', function(ticker) {
      logBlue('socket  on')
      trackTicker(socket, ticker);
    });*/
    // eth socket
    socket.on('tickerETH', function(ticker) {
      logMagenta('ETH socket on');
      tickETH(socket, ticker);
    });
    //ltc socket
    socket.on('tickerLTC', function(ticker) {
      logYellow('LTC socket on');
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
// sockets = purple
//
