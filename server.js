#!/usr/bin/env node

var consolidate = require('consolidate'),
    express     = require('express'),
    serialport  = require('serialport'),
    swig        = require('swig'),
    path        = require('path'),
    _           = require('underscore');

var app = express();

app.engine('.html', consolidate.swig);
app.set('view engine', 'html');

var viewsDir = path.join(__dirname, 'views');

swig.init({
    root: viewsDir,
    allowErrors: true
});
app.set('views', viewsDir);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
    res.render('index.html');
});
