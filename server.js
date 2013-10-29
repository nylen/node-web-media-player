#!/usr/bin/env node

// Set up logger before doing anything else, so modules that require it can use
// it immediately
var config  = require('config'),
    winston = require('winston');

if (!config.app) {
    throw new Error(
        'Configuration settings not found.  Please copy config/example.yml '
        + 'to config/default.yml and edit as needed.');
}

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
    filters        = require('./lib/filters'),
    express        = require('express'),
    expressWinston = require('./lib/vendor/express-winston'),
    flash          = require('connect-flash'),
    LocalStrategy  = require('passport-local').Strategy,
    MongoClient    = require('mongodb').MongoClient,
    MongoStore     = require('connect-mongo')(express),
    passport       = require('passport'),
    path           = require('path'),
    swig           = require('swig'),
    users          = require('./lib/users'),
    watch          = require('watch');

require('express-namespace');

var app = express();

var viewsDir = path.join(__dirname, 'views');
filters.setFilters();
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', viewsDir);

watch.watchTree(viewsDir, function(f, curr, prev) {
    var op = '';
    if (typeof f == 'object' && prev === null && curr === null) {
        // Finished walking the tree
        return;
    } else if (prev === null) {
        // f is a new file
        op = 'created';
    } else if (curr.nlink === 0) {
        // f was removed
        op = 'removed';
    } else {
        // f was changed
        op = 'changed';
    }
    log.info("Template file '%s' %s; invalidating template cache",
        f, op);
    swig.invalidateCache();
});

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
    if (users.any()) {
        var user = users.get(username);
        if (user) {
            done(null, user);
        } else {
            done(new Error('Invalid username or password.'));
        }
    } else {
        done(null, null);
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

function setupWithDb(db) {
    if (db) {
        log.info('Using MongoDB session store');
        app.use(express.session({
            secret : config.app.secret,
            store  : new MongoStore({
                db : db
            })
        }));
    } else {
        log.warn('Using in-memory session store');
        app.use(express.session({
            secret : config.app.secret
        }));
    }

    app.use(flash());
    app.use(passport.initialize());
    app.use(passport.session());

    var msgTypes = ['error', 'warning', 'info', 'success'];

    // Custom middleware to set template variables
    app.use(function(req, res, next) {
        res.locals.namespace = namespace;
        res.locals.qs        = req.query;

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

    app.vars = {
        namespace : namespace
    };

    users.init(function() {
        app.namespace(namespace, function() {
            routes.setRoutes(app, config, function listen() {
                app.listen(config.app.port);
                log.info('Started server on port ' + config.app.port);
            });
        });
    });
}

if (config.app.mongoUrl) {
    MongoClient.connect(config.app.mongoUrl, {
        server: {
            socketOptions: {
                connectTimeoutMS : 250,
                socketTimeoutMS  : 250
            }
        }
    }, function(err, db) {
        if (err) {
            log.warn('Error connecting to MongoDB: ' + (err.message || require('util').inspect(err)));
            setupWithDb(null);
        } else {
            setupWithDb(db);
        }
    });
} else {
    log.warn('MongoDB connection string (config.app.mongoUrl) not given');
    process.nextTick(function() {
        setupWithDb(null);
    });
}
