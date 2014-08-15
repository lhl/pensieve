/*** SETUP ***/
var bodyParser = require('body-parser');
var express = require('express');
var exphbs = require('express-handlebars');
var fs = require('fs');
var os = require('os');
var path = require('path');
var sha1 = require('sha1');
var stringify = require('json-stable-stringify');

var app = express();

// Templates
app.engine('handlebars', exphbs({defaultLayout: 'main', extname: '.handlebars'}));
app.set('view engine', 'handlebars');

// POST Parsing
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


/*** CONFIG ***/
var config = require('config.json')();


/*** ROUTES ***/
app.use(express.static(path.join(__dirname, 'public')));

var router = express.Router();
router.use(function(req, res, next) {
  // TODO: add auth here
  console.log(req.method, req.url);
  next();
});


// Home Page
router.get('/', function(req, res) {
  try {
    var pages = JSON.parse(fs.readFileSync(config.repo + "/pages.json", 'utf8'));
    res.redirect('/page/' + pages[0]['id']);

  // Only if there are no pages!
  } catch(err) {
    res.render('page', {
      title: '',
      content: '',
      page: '{}',
      pages: '[]'
    });
  }
});


// Pages JSON
router.route('/pages')
  .get(function(req, res) {
     // check if pages exists else send empty
     try {
       res.json(fs.readFileSync(config.repo + "/pages.json"));
     } catch(err) {
       res.json([]);
     }
  })

  .post(function(req, res) {
    fs.writeFileSync(config.repo + "/pages.json", 
                     stringify(req.body.pages, {spaces: 2}),
                     'utf8'
                    );
  });


// Each Page
router.route('/page/:page')
  .get(function(req, res) {
    var metadata_path = config.repo + "/" + req.params.page + ".meta";
    var page = JSON.parse(fs.readFileSync(metadata_path, 'utf8'));

    var content_path = config.repo + "/" + req.params.page + ".html";
    var content = fs.readFileSync(content_path, 'utf8');

    var pages = JSON.parse(fs.readFileSync(config.repo + "/pages.json", 'utf8'));

    // TODO: PJAX vs Regular
    res.render('page', { 
      title: page['title'],
      content: content,
      page: stringify(page), 
      pages: stringify(pages)
    });
  })

  // Save
  .post(function(req, res) {
    var content_path = config.repo + "/" + req.params.page + ".html";
    var content = req.body.content;
    fs.writeFileSync(content_path, content, 'utf8');

    var metadata_path = config.repo + "/" + req.params.page + ".meta";
    var metadata = { title: req.body.title,
                     id: req.body.id,
                     seed: req.body.seed
                   };
    fs.writeFileSync(metadata_path, stringify(metadata, {space: 2}), 'utf8');

    res.send('Page: ' + req.params.page);

  });

// Images
router.route('/image/:image')
  .get(function(req, res) {
    res.send('Images');
  })
  .post(function(req, res) {
    res.send('Images');
  });

// Files
router.route('/file/:file')
  .get(function(req, res) {
    res.send('Files');
  })
  .post(function(req, res) {
    res.send('Files');
  });

app.use('/', router);


/*** SERVER ***/
var server = app.listen(3000, function() {
  console.log('Listening on port %d', server.address().port);
});


/*** EXPORT ***/
module.exports = app;
