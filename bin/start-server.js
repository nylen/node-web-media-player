#!/usr/bin/env node

var child_process = require('child_process'),
    express = require('express'),
    fs = require('fs'),
    path = require('path');

try {
    var config = require('../config');
} catch (ex) {
    throw new Error(
        'Cannot find config.js file.  Please copy and amend the example_config.js file as appropriate.');
}

function normalizePath(p, isFile) {
    return path.normalize(p).replace(/\/+$/, '') + (isFile ? '' : '/');
}

function validatePath(pathParam, isFile) {
    var absPath = normalizePath(path.join(config.mediaPath, pathParam), isFile);
    if (absPath.substring(0, config.mediaPath.length) !== config.mediaPath) {
        throw new Error('Access to that path is prohibited.');
    }
    var relPath = absPath.substring(config.mediaPath.length);
    return {
        abs: absPath,
        rel: relPath
    };
}

config.mediaPath = normalizePath(config.mediaPath);

var app = express(),
    nowPlaying = {};

app.get('/', function(req, res) {
    res.redirect('/browse');
});

function browsePath(pathParam, cb) {
    var pathInfo = validatePath(pathParam);

    var dirEntries = fs.readdirSync(pathInfo.abs);
    dirEntries.sort(function(a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });

    var html = 'You are browsing: <b>' + (pathInfo.rel || '(root directory)') + '</b>\n';

    if (pathInfo.abs !== config.mediaPath) {
        html += '<ul><li><a href="/browse/' + path.dirname(pathInfo.rel) + '">(Go up a directory)</a></li></ul>\n';
    }

    var dirs = [], files = [];

    for (var i = 0; i < dirEntries.length; i++) {
        if (fs.statSync(pathInfo.abs + dirEntries[i]).isDirectory()) {
            dirs.push(dirEntries[i]);
        } else {
            files.push(dirEntries[i]);
        }
    }

    if (dirs.length) {
        html += '<div>Directories:</div><ul>\n';
        for (var i = 0; i < dirs.length; i++) {
            html += '<li><a href="/browse/' + pathInfo.rel + dirs[i] + '">' + dirs[i] + '/</a></li>\n';
        }
        html += '</ul>\n';
    }

    if (files.length) {
        html += '<div>Files:</div><ul>\n';
        for (var i = 0; i < files.length; i++) {
            html += '<li><a href="/play?filename=' + pathInfo.rel + files[i] + '">' + files[i] + '</a></li>\n';
        }
        html += '</ul>\n';
    }

    if (nowPlaying.child) {
        html += '<div>Now playing: <b>' + nowPlaying.filename + '</b>';
        if (nowPlaying.paused) {
            html += ' (paused)\n<ul><li><a href="/control/play?dir=' + pathInfo.rel + '">Play</a>';
        } else {
            html += '\n<ul><li><a href="/control/pause?dir=' + pathInfo.rel + '">Pause</a>';
        }
        html += '<li><a href="/control/exit?dir=' + pathInfo.rel + '">Stop</a>';
    }

    cb(html);
}

function handleBrowseRequest(req, res, pathParam) {
    browsePath(pathParam, function(html) {
        res.send(html);
    });
}

function playFile(filePath) {
    console.log('Playing file:', filePath);
    nowPlaying.child = child_process.exec(
        config.player.commands.start.replace('%f', filePath.abs),
        function(err, stdout, stderr) {
            console.log(' ==== Player process terminated ==== ');
            if (err) {
                console.log('Error:', err);
            }
            console.log('Stdout:', stdout.toString('utf8'));
            console.log('Stderr:', stderr.toString('utf8'));
        });
    nowPlaying.child.on('exit', function() {
        nowPlaying = {};
    });
    nowPlaying.filename = filePath.rel;
    nowPlaying.started = new Date();
    nowPlaying.paused = false;
}

function sendPlayerCommand(command, cb) {
    if (!nowPlaying.child) {
        throw new Error('No player to control!');
    }

    switch (command) {
        case 'exit':
            var killTimeout;

            nowPlaying.child.on('exit', function() {
                clearTimeout(killTimeout);
                cb();
            });

            killTimeout = setTimeout(function() {
                console.log('Player process did not exit; killing');
                if (config.player.commands.kill) {
                    child_process.exec(config.player.commands.kill);
                } else {
                    nowPlaying.child.kill('SIGTERM');
                }
            }, config.player.exitTimeout);

            break;

        case 'pause':
            nowPlaying.paused = true;
            break;

        case 'play':
            nowPlaying.paused = false;
            break;
    }

    var commandString = config.player.controls[command];
    console.log('Sending player command "' + command + '": "' + commandString + '"');
    nowPlaying.child.stdin.write(commandString);

    if (command != 'exit') {
        cb();
    }
}

app.get('/browse', function(req, res) {
    handleBrowseRequest(req, res, '');
});

app.get('/browse/*', function(req, res) {
    handleBrowseRequest(req, res, req.params[0]);
});

app.get('/play', function(req, res) {
    var filePath = validatePath(req.query.filename, true);
    if (nowPlaying.child) {
        sendPlayerCommand('exit', function() {
            playFile(filePath);
            res.redirect(302, '/browse/' + path.dirname(filePath.rel));
        });
    } else {
        playFile(filePath);
        res.redirect(302, '/browse/' + path.dirname(filePath.rel));
    }
});

app.get('/control/:command', function(req, res) {
    sendPlayerCommand(req.params.command, function() {
        var filePath = validatePath(req.query.dir);
        res.redirect(302, '/browse/' + filePath.rel);
    });
});

app.listen(3000);
console.log('Listening on port 3000');
