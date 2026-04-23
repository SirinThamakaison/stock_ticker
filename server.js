//load modules for server, files, url, and mongo
var http = require('http');
var fs = require('fs');
var url = require('url');
var MongoClient = require('mongodb').MongoClient;

//atlas connection string from environment variable on the host
var mongoUrl = (process.env.MONGODB_URI || '').trim();
var port = process.env.PORT || 8080;

http.createServer(function (req, res) {
  var u = url.parse(req.url, true);
  var pathname = u.pathname;

  //home view: show the form from html file
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
    //get form data from query string (get method)
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
      res.end('Missing MONGODB_URI.');
      return;
    }

    //connect db
    MongoClient.connect(mongoUrl, function (err, client) {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('Connection err: ' + err);
        return;
      }

      //use stock database and publiccompanies collection from the assignment
      var dbo = client.db('Stock');
      var coll = dbo.collection('PublicCompanies');

      //build filter: company name or ticker (regex so it is not case sensitive)
      var esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var filter;
      if (how === 'ticker') {
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

        //assignment: print matches to the console
        var i;
        for (i = 0; i < rows.length; i++) {
          console.log(
            rows[i].company + ', ' + rows[i].ticker + ', ' + rows[i].price
          );
        }

        //assignment: show same data on the web page
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write('<html><head><meta charset="utf-8"><title>Process</title></head><body>');
        res.write('<h1>Process</h1>');
        res.write('<p>You searched for: ' + search + '</p>');
        res.write(
          '<p>Type: ' +
            (how === 'ticker' ? 'ticker symbol' : 'company name') +
            '</p>'
        );

        if (rows.length === 0) {
          res.write('<p>No matches.</p>');
        } else {
          res.write('<table border="1" cellpadding="5">');
          res.write('<tr><th>Company</th><th>Ticker</th><th>Price</th></tr>');
          for (i = 0; i < rows.length; i++) {
            res.write('<tr>');
            res.write('<td>' + rows[i].company + '</td>');
            res.write('<td>' + rows[i].ticker + '</td>');
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
