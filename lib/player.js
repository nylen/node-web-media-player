var cp   = require('child_process'),
    fs   = require('fs'),
    path = require('path');

var config = null;

function setConfig(cfg) {
    config = cfg;
    config.media_path = normalizePath(config.media_path);
}

function normalizePath(p, isFile) {
    return path.normalize(p).replace(/\/+$/, '') + (isFile ? '' : '/');
}

function validatePath(pathParam, isFile) {
    var absPath = normalizePath(path.join(config.media_path, pathParam), isFile);
    if (absPath.substring(0, config.media_path.length) !== config.media_path) {
        throw new Error('Access to that path is prohibited.');
    }
    var relPath = absPath.substring(config.media_path.length);
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
        parent: (pathInfo.abs === config.media_path ? null : path.dirname(pathInfo.rel)),
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

    for (var n in config.player.controls.seek) {
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
    console.log('Playing file:', filePath);
    nowPlaying.child = cp.exec(
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
                console.log('Player process did not exit; killing');
                if (config.player.commands.kill) {
                    cp.exec(config.player.commands.kill);
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
    if (command == 'seek') {
        commandString = commandString[params.n];
    }
    console.log('Sending player command "' + command + '": ' + JSON.stringify(commandString));
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
