#!/usr/bin/env node

var appRoutes   = require('./lib/routes'),
    config      = require('config'),
    consolidate = require('consolidate'),
    express     = require('express'),
    path        = require('path'),
    swig        = require('swig');

require('express-namespace');

var app = express();

app.engine('.html', consolidate.swig);
app.set('view engine', 'html');

var viewsDir = path.join(__dirname, 'views');

swig.init({
    root: viewsDir,
    allowErrors: true
});
app.set('views', viewsDir);

if (config.app.trust_proxy) {
    app.set('trust proxy', true);
}

var namespace = config.app.namespace || '';

app.use(function(req, res, next) {
    res.locals.namespace = namespace;
    next();
});

app.use(namespace, express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
    res.redirect(namespace);
});

app.namespace(namespace, function() {
    appRoutes(app, config, function listen() {
        app.listen(config.app.port);
        console.log('Started server on port ' + config.app.port);
    });
});
