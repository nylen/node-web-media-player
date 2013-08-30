var cp   = require('child_process'),
    fs   = require('fs'),
    log  = require('./logger'),
    path = require('path');

var config    = null,
    mediaPath = '';

function setConfig(cfg) {
    config = cfg;
    mediaPath = normalizePath(config.mediaPath);
}

function normalizePath(p, isFile) {
    return path.normalize(p).replace(/\/+$/, '') + (isFile ? '' : '/');
}

function validatePath(pathParam, isFile) {
    var absPath = normalizePath(path.join(mediaPath, pathParam), isFile);
    if (absPath.substring(0, mediaPath.length) !== mediaPath) {
        throw new Error('Access to that path is prohibited.');
    }
    var relPath = absPath.substring(mediaPath.length);
    return {
        abs: absPath,
        rel: relPath
    };
}

var nowPlaying = {};

function getBrowseData(pathParam) {
    var pathInfo = validatePath(pathParam);

    var data = {
        directory: pathInfo.rel,
        parent: (pathInfo.abs === mediaPath ? null : path.dirname(pathInfo.rel)),
        dirs: [],
        files: [],
        seekCommands: []
    };

    var dirEntries = fs.readdirSync(pathInfo.abs);
    dirEntries.sort(function(a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });

    for (var i = 0; i < dirEntries.length; i++) {
        if (fs.statSync(pathInfo.abs + dirEntries[i]).isDirectory()) {
            data.dirs.push(dirEntries[i]);
        } else {
            data.files.push(dirEntries[i]);
        }
    }

    if (nowPlaying.child) {
        data.playing = true;
        data.currentFilename = nowPlaying.filename;
        data.paused = nowPlaying.paused;
    }

    for (var n in config.controls.seek) {
        data.seekCommands.push({
            value: n,
            text: (n < 0 ? 'back ' : 'forward ') + Math.abs(n) + 's'
        });
    }

    return data;
}

function handleBrowseRequest(req, res, pathParam) {
    browsePath(pathParam, function(html) {
        res.send(html);
    });
}

function playFile(filePath, cb) {
    if (nowPlaying.child) {
        sendCommand('exit', function() {
            playFileInternal(filePath);
            cb();
        });
    } else {
        playFileInternal(filePath);
        process.nextTick(cb);
    }
}

function playFileInternal(filePath) {
    log.info('Playing file:', filePath);
    nowPlaying.child = cp.exec(
        config.commands.start.replace('%f', filePath.abs),
        function(err, stdout, stderr) {
            log.info('Player process terminated');
            if (err) {
                log.error('Error:', err);
            }
            log.info('Stdout:', stdout.toString('utf8'));
            log.info('Stderr:', stderr.toString('utf8'));
        });
    nowPlaying.child.on('exit', function() {
        nowPlaying = {};
    });
    nowPlaying.filename = filePath.rel;
    nowPlaying.started = new Date();
    nowPlaying.paused = false;
}

function sendCommand(command, cb, params) {
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
                log.warn('Player process did not exit; killing');
                if (config.commands.kill) {
                    cp.exec(config.commands.kill);
                } else {
                    nowPlaying.child.kill('SIGTERM');
                }
            }, config.exitTimeout);

            break;

        case 'pause':
            nowPlaying.paused = true;
            break;

        case 'play':
            nowPlaying.paused = false;
            break;
    }

    var commandString = config.controls[command];
    if (command == 'seek') {
        commandString = commandString[params.n];
    }
    log.info('Sending player command "' + command + '": ' + JSON.stringify(commandString));
    nowPlaying.child.stdin.write(commandString);

    if (command != 'exit') {
        cb();
    }
}

exports.setConfig     = setConfig;
exports.getBrowseData = getBrowseData;
exports.playFile      = playFile;
exports.validatePath  = validatePath;
exports.sendCommand   = sendCommand;
