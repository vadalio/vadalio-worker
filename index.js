require('dotenv').load();

var cors = require('cors');
var http = require('http');
var express = require('express');
var errorhandler = require('errorhandler');
var bodyParser = require('body-parser');

var app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(cors());

function checkAuth (req, res, next) {
  if (req.get('Authorization') && req.get('Authorization') === 'PAPANOMA') {
    next();
  } else {
    res.status(401).send('Authorization needed bro');
  }
}

app.get('/version', function(req, res) {
  res.send('0.0.0-alpha');
});

app.post('/run', checkAuth, function(req, res) {
  req.code = req.body;

  var clientCode = null;
  try {
    var factory = new Function('require', req.code);
    clientCode = factory(require);
    if (typeof clientCode !== 'function') {
        var msg = 'The code does not return a JavaScript function.';
        throw new Error(msg, 400);
    }
    if (clientCode.length === 0 || clientCode.length > 2) {
        var msg = 'The JavaScript function must have one of the following signature: (ctx, callback)';
        throw new Error(msg, 400);
    }
  } catch (e) {
      var msg = 'Unable to compile submitted JavaScript. ' + e.toString();
      throw new Error(msg, 500);
  }

  var args = [];
  if (clientCode.length === 2) {
    args.push({});
  }

  args.push(function(err, data) {
    if (err) {
      throw new Error('Script returned error.', 400);
    }
    var returnBody = null;
    try {
      returnBody = data ? JSON.stringify(data): '{}';
    } catch (e) {
      throw new Error('Error when JSON serializing the result of the JavaScript code.', 400);
    }

    res.set('Content-Type', 'application/json').status(200).send(returnBody);
  });

  try {
    clientCode.apply(this, args);
  } catch(e) {
    throw new Error('Script generated an unhandled synchronous exception. ' + e.toString(), 500);
  }
});

var port = process.env.PORT || 3001;

http.createServer(app).listen(port, function (err) {
  console.log('listening in http://localhost:' + port);
});
