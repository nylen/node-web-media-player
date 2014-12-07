#!/usr/bin/env node

var fs   = require('fs'),
    path = require('path');

var statusFile = path.join(__dirname, 'dummy-mount.txt'),
    mediaPath  = process.argv[2],
    touchFile  = path.join(mediaPath, 'mounted.txt');
    statusText = 'mount:' + mediaPath;

console.log(statusText);
fs.writeFileSync(statusFile, statusText);
fs.writeFileSync(touchFile , statusText);
