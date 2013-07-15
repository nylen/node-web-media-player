#!/usr/bin/env node

// Set up logger before doing anything else, so modules that require it can use
// it immediately
var config  = require('config'),
    winston = require('winston');

var log = new winston.Logger({
    transports: [
        new winston.transports.Console({
            colorize: true,
            level: ((config.logging ? config.logging.level : null) || 'http')
        })
    ]
});
log.cli();
log.levels.http = 4.5;
log.setLevels(log.levels);
winston.addColors({ http: 'grey' });

// Modify log.{info,...} methods to be the same as log.log({'info',...}, ...)
for (var level in log.levels) {
    (function(level) {
        log[level] = function() {
            log.log.apply(log,
                [level].concat([].slice.call(arguments)));
        };
    })(level);
}

// Make logging available as: var log = require('./lib/logger');
log.extend(require('./lib/logger'));

var routes         = require('./routes/main'),
    consolidate    = require('consolidate'),
    express        = require('express'),
    expressWinston = require('./lib/vendor/express-winston'),
    path           = require('path'),
    swig           = require('swig');

require('express-namespace');

var app = express();

app.engine('.html', consolidate.swig);
app.set('view engine', 'html');

var viewsDir = path.join(__dirname, 'views');

swig.init({
    root: viewsDir,
    allowErrors: true,
    filters: require('./lib/filters.js')
});
app.set('views', viewsDir);

if (config.app.trustProxy) {
    app.set('trust proxy', true);
}

var namespace = config.app.namespace || '';

app.use(function(req, res, next) {
    res.locals.namespace = namespace;
    res.locals.qs = req.query;
    next();
});

app.use(express.bodyParser());

app.use(expressWinston.logger({
    logger: log,
    level: 'http'
}));

app.use(app.router);

app.use(namespace, express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
    res.redirect(namespace);
});

app.namespace(namespace, function() {
    routes.setRoutes(app, config, function listen() {
        app.listen(config.app.port);
        log.info('Started server on port ' + config.app.port);
    });
});
