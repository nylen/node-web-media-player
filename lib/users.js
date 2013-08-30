var config = require('config'),
    crypto = require('crypto'),
    fs     = require('fs'),
    Lazy   = require('lazy'),
    log    = require('./logger'),
    util   = require('util');

var users     = {},
    usersFile = config.auth && config.auth.digestFile || '(filename missing)',
    lastMtime = 0;

function usersFileChanged(done) {
    if (typeof done != 'function') {
        done = function() { };
    }
    fs.stat(usersFile, function(err, stats) {
        if (err) {
            return done(err);
        }
        if (!stats.isFile()) {
            return done(new Error(util.format(
                "File '%s' does not exist.", filename)));
        }
        if (stats.mtime != lastMtime) {
            lastMtime = stats.mtime;
            var newUsers = {};
            new Lazy(fs.createReadStream(usersFile))
                .lines
                .forEach(function(line) {
                    var pieces = line.toString().split(':');
                    if (pieces.length == 3) {
                        newUsers[pieces[0]] = {
                            username     : pieces[0],
                            digestRealm  : pieces[1],
                            passwordHash : pieces[2]
                        };
                    }
                }).join(function() {
                    users = newUsers;
                    var numUsers = Object.keys(users).length;
                    log.info(
                        'Loaded %d authorized user%s',
                        numUsers, (numUsers == 1 ? '' : 's'));
                });
        }
    });
}

exports.init = function(done) {
    usersFileChanged(function(err) {
        if (err) {
            log.warn('Failed to read users file: ' + err.message);
        }
        done();
    });

    try {
        fs.watch(usersFile, { persistent: false }, function(event, filename) {
            if (event == 'change') {
                log.info('Users file changed, reloading');
                usersFileChanged();
            }
        });
    } catch (err) {
        log.warn('Failed to watch users file: ' + err.message);
    }
};

exports.test = function(username, password) {
    var user = users[username];
    if (user) {
        var md5 = crypto
            .createHash('md5')
            .update([username, user.digestRealm, password].join(':'))
            .digest('hex');
        if (md5 == user.passwordHash) {
            return user;
        } else {
            return false;
        }
    } else {
        return false;
    }
};

exports.get = function(username) {
    return users[username] || false;
};
