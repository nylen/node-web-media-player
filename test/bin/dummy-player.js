#!/usr/bin/env node

var equal = require('deep-equal'),
    path  = require('path'),
    fs    = require('fs');

var mediaFile  = process.argv[2],
    statusFile = path.join(__dirname, 'dummy-player-status.txt'),
    pidFile    = path.join(__dirname, 'dummy-player-pid.txt'),
    quitFile   = path.join(__dirname, 'dummy-exit-on-quit.txt');

console.log('dummy player media file: ' + mediaFile);

fs.writeFileSync(pidFile, process.pid);

function setStatus(txt) {
    console.log('dummy player status: ' + txt);
    fs.writeFileSync(statusFile, txt + ':' + mediaFile);
}

function quit() {
    setStatus('goodbye cruel world');
    process.exit(0);
}

process.on('SIGINT', quit);

setStatus('started');

var stdin = process.stdin;

try {
    stdin.setRawMode(true);
    stdin.resume();
} catch (err) { }

stdin.on('data', function(key) {
    key = [].slice.call(key);
    if (equal(key, ['y'.charCodeAt(0)])) {
        setStatus('playing');
    } else if (equal(key, ['n'.charCodeAt(0)])) {
        setStatus('paused');
    } else if (equal(key, ['q'.charCodeAt(0)])) {
        setStatus('finished');
        if (fs.readFileSync(quitFile, 'utf8') == 'true') {
            process.exit(0);
        }
    } else if (equal(key, [0x1b, 0x5b, 0x44])) { // left arrow
        setStatus('seek -10');
    } else if (equal(key, [0x1b, 0x5b, 0x43])) { // right arrow
        setStatus('seek 10');
    } else if (equal(key, [0x1b, 0x5b, 0x42])) { // down arrow
        setStatus('seek -60');
    } else if (equal(key, [0x1b, 0x5b, 0x41])) { // up arrow
        setStatus('seek 60');
    } else if (equal(key, [3])) { // ^C
        quit();
    } else {
        console.log('unrecognized key:', key);
    }
});
