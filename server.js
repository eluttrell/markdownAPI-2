const fs = require('fs'),
    express = require('express'),
    app = express(),
    bodyParser = require('body-Parser'),
    marked = require('marked'),
    morgan = require('morgan'),
    accessLogStream = fs.createWriteStream(__dirname + '/access.log', {flags: 'a'}),
    bcrypt = require('bcrypt'),
    uuid = require('uuid'),
    pgp = require('pg-promise')();

const db = pgp('markdownAPI_db');

app.use(morgan('dev', {stream: accessLogStream}));
app.use(bodyParser.json());
app.set('view engine', 'hbs');

app.post('/api/signup', function(req, res) {
    let info = req.body;
    bcrypt.hash(info.password, 10, function(err, hash) {
      if (err) {
      res.json({status: "Failed"});
      return;
    } else {
      db.query('INSERT INTO guests VALUES (default, $1, $2)', [info.name, hash]).then(function() {
        res.json({status: 'Success'});
      }).catch(function(err) {
        console.log(err);
        res.json({statud: 'Failed', error: err.message});
      });
    }
  });
});

app.post('/api/login', function(req, res) {
    let info = req.body;
    db.query('SELECT * FROM guests WHERE guests.name = $1', [info.name]).then(function(existingInfo) {
      console.log(existingInfo);
      bcrypt.compare(info.password, existingInfo[0].password, function(err, hash) {
        if (err) {
          res.json({ status: "Failed" });
          return;
        } else if (!hash) {
          res.status(401).json({ status: "Failed", message: "Incorrect Password" });
          return;
        } else {
          var token = uuid();
          var id = existingInfo[0].id;
          db.query('INSERT INTO tokens VALUES (default, $1, $2)', [id, token]);
          res.status(200).json({ message: "Successfully inserted" });
        }
      });
    });
});

app.use(function(req, res, next) {
  var token = req.query.token;
  if (token = '48471ffa-4686-4215-88a3-c17fcd59ac6a') {
    next();
  } else {
    res.status(418).json({ status: "Fuck off, teapot" });
  }
});

app.put('/api/documents/:filepath', function(req, res) {
    let filepath = './data/' + req.params.filepath;
    let contents = req.body.content;
    let info = req.body;
    // db.query('INSERT INTO files VALUES (default, $1)', [info.contents]).then()
    fs.writeFile(filepath, contents, (err) => {
        if (err) {
            res.status(500);
            res.json({
                message: 'Could not save file: ' + err.message
            });
        } else {
            res.json({
                message: 'File ' + filepath + ' saved.'
            });
            console.log('It\'s saved!');
        }
    });
});

app.get('/api/documents/:filepath', function(req, res) {
    let filepath = './data/' + req.params.filepath;
    fs.readFile(filepath, 'utf8', (err, data) => {
      if (err) {
        res.status(404);
        res.json({
          message: 'Requested file not found. ' + err.message
        });
      } else {
        res.json({
          message: data
        });
      }
    });
});

app.get('/api/documents/:filepath/display', function(req, res) {
    let filepath = './data/' + req.params.filepath;
    fs.readFile(filepath, 'utf8', (err, data) => {
      if (err) {
        res.status(404);
        res.json({
          message: 'Requested file not found. ' + err.message
        });
      } else {
        res.render('display.hbs', {
          title: req.params.filepath,
          body: marked(data)
        });
      }
    });
});

app.get('/api/documents', function(req, res) {
    fs.readdir('./data/', (err, files) => {
      if (err) {
        res.status(404);
        res.json({
          message: 'Requested file not found. ' + err.message
        });
      } else {
        res.json({
          message: files
        });
      }
    });
});

app.delete('/api/documents/:filepath', function(req, res) {
    let filepath = './data/' + req.params.filepath;
    fs.unlink(filepath, (err) => {
      if (err) {
        res.status(404);
        res.json({
          message: 'Requested file not found. ' + err.message
        });
      } else {
        res.json({
          message: 'File was successfully deleted.'
        });
      }
    });
});

app.listen(1337, function() {
  console.log('Listening to 1337');
});
