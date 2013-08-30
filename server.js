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
    flash          = require('connect-flash'),
    LocalStrategy  = require('passport-local').Strategy,
    passport       = require('passport'),
    path           = require('path'),
    swig           = require('swig'),
    users          = require('./lib/users');

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

app.use(express.bodyParser());

app.use(expressWinston.logger({
    logger: log,
    level: 'http'
}));

passport.use(new LocalStrategy(function(username, password, done) {
    var user = users.test(username, password);
    if (user) {
        done(null, user);
    } else {
        done(null, false, {
            message: 'Invalid username or password.'
        });
    }
}));

passport.serializeUser(function(user, done) {
    done(null, user.username);
});

passport.deserializeUser(function(username, done) {
    var user = users.get(username);
    if (user) {
        done(null, user);
    } else {
        done(new Error('Invalid username or password.'));
    }
});

app.ensureAuthenticated = function(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        req.session.returnTo = req.url;
        res.redirect(namespace + '/login');
    }
};

app.use(express.cookieParser());
app.use(express.session({ secret: config.app.secret }));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

var msgTypes = ['error', 'warning', 'info', 'success'];

// Custom middleware to set template variables
app.use(function(req, res, next) {
    res.locals.namespace = namespace;
    res.locals.qs        = req.query;
    res.locals.flash     = req.flash;

    if (req.isAuthenticated()) {
        res.locals.user = req.user;
    }

    res.locals.messages = [];
    msgTypes.forEach(function(type) {
        req.flash(type).forEach(function(msg) {
            res.locals.messages.push({
                type    : type,
                message : msg
            });
        });
    });
    next();
});

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
