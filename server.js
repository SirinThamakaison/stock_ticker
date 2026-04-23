// Part 2: Home + Process views, GET form, query Stock.PublicCompanies on Atlas
// Local:  MONGODB_URI="..." node server.js
// Heroku: set MONGODB_URI in config vars, git push heroku main

var http = require('http');
var fs = require('fs');
var url = require('url');
var MongoClient = require('mongodb').MongoClient;

// Atlas string from Heroku config var, or paste in the empty string below for local tests.
var mongoUrl = process.env.MONGODB_URI || '';

var port = process.env.PORT || 8080;

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

http.createServer(function (req, res) {
  var u = url.parse(req.url, true);
  var pathname = u.pathname;

  if (pathname === '/' || pathname === '/home.html') {
    fs.readFile('home.html', function (err, txt) {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('Could not open home.html');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.write(txt);
      res.end();
    });
  } else if (pathname === '/process') {
    var q = u.query;
    var search = (q.search || '').trim();
    var how = q.how || 'company';

    if (search === '') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.write('<p>Please type something in the search box.</p>');
      res.write('<a href="/">Back</a>');
      res.end();
      return;
    }

    if (!mongoUrl) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(
        'Missing MONGODB_URI. On Heroku add it in Settings &rarr; Config Vars. Locally export it or paste it in server.js.'
      );
      return;
    }

    MongoClient.connect(mongoUrl, function (err, client) {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('Connection err: ' + err);
        return;
      }

      var dbo = client.db('Stock');
      var coll = dbo.collection('PublicCompanies');

      var esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var filter;
      if (how === 'ticker') {
        // substring so typing AMZ still matches AMZN (class test list)
        filter = { ticker: new RegExp(esc, 'i') };
      } else {
        filter = { company: new RegExp(esc, 'i') };
      }

      coll.find(filter).toArray(function (findErr, rows) {
        client.close();

        if (findErr) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('Find err: ' + findErr);
          return;
        }

        console.log('--- Process view ---');
        console.log('search = ' + search + ', how = ' + how);
        var i;
        for (i = 0; i < rows.length; i++) {
          console.log(
            rows[i].company + ' | ' + rows[i].ticker + ' | ' + rows[i].price
          );
        }
        console.log('matches: ' + rows.length);
        console.log('--- end ---');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write('<html><head><meta charset="utf-8"><title>Results</title></head><body>');
        res.write('<h1>Results</h1>');
        res.write(
          '<p>Search text: <strong>' +
            escHtml(search) +
            '</strong> &mdash; ' +
            (how === 'ticker' ? 'ticker symbol' : 'company name') +
            '</p>'
        );

        if (rows.length === 0) {
          res.write('<p>No rows matched.</p>');
        } else {
          res.write('<table border="1" cellpadding="5">');
          res.write('<tr><th>Company</th><th>Ticker</th><th>Price</th></tr>');
          for (i = 0; i < rows.length; i++) {
            res.write('<tr>');
            res.write('<td>' + escHtml(rows[i].company) + '</td>');
            res.write('<td>' + escHtml(rows[i].ticker) + '</td>');
            res.write('<td>' + rows[i].price + '</td>');
            res.write('</tr>');
          }
          res.write('</table>');
        }

        res.write('<p><a href="/">Home</a></p>');
        res.write('</body></html>');
        res.end();
      });
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.write('Unknown page request');
    res.end();
  }
}).listen(port);

console.log('Server running on port ' + port);
