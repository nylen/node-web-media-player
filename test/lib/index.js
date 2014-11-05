// expect cwd to be project root (contains server.js)
process.env.NODE_CONFIG_DIR = './test/config';

var cp          = require('child_process'),
    config      = require('config'),
    mongodb     = require('mongodb'),
    must        = require('must'),
    portscanner = require('portscanner'),
    zombie      = require('zombie');

exports.db        = null;
exports.server    = null;
exports.baseUrl   = 'http://localhost:' + config.app.port;
exports.browser   = null;
exports.redirects = [];
exports.username  = 'test';
exports.password  = 'testing';

exports.dropDatabase = function(done) {
    mongodb.MongoClient.connect(config.app.mongoUrl, function(err, db) {
        must(err).not.exist();
        db.dropDatabase(function(err) {
            must(err).not.exist();
            db.close();
            done();
        });
    });
};

exports.ensureConnected = function(done) {
    if (exports.db) {
        process.nextTick(done);
    } else {
        mongodb.MongoClient.connect(config.app.mongoUrl, function(err, db) {
            exports.db = db;
            done();
        });
    }
};

exports.startServer = function(done) {
    exports.server = cp.spawn('node', ['server.js'],
        (process.env.DEBUG_SERVER ? { stdio : 'inherit' } : null));

    function checkPort(port, cb, timeout) {
        timeout = timeout || 5000;

        var start    = +new Date,
            interval = 500;

        portscanner.checkPortStatus(port, 'localhost', function(err, status) {
            if (err) {
                cb(err);
            } else if (status == 'open') {
                cb(null);
            } else {
                timeout -= new Date - start + interval;
                if (timeout < 0) {
                    cb(new Error('Port not open yet'));
                } else {
                    setTimeout(function() {
                        checkPort(port, cb, timeout);
                    }, interval);
                }
            }
        });
    }

    checkPort(config.app.port, function(err) {
        if (err) throw err;
        // Give the server a little extra time to load, I got ECONNRESET
        // once
        setTimeout(function() {
            exports.dropDatabase(done);
        }, 300);
    });
};

exports.closeServer = function(done) {
    exports.server.once('exit', function() {
        exports.dropDatabase(done);
    });
    exports.server.kill('SIGINT');
};

exports.createBrowser = function() {
    exports.browser = zombie.create();
    exports.browser.on('redirect', function(req, res) {
        exports.redirects.push(res.url);
    });
    return exports.browser;
};

exports.clearRedirects = function() {
    exports.redirects = [];
};
