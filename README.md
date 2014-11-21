# Node.js web media player [![Build status](https://img.shields.io/travis/nylen/node-web-media-player.svg?style=flat)](https://travis-ci.org/nylen/node-web-media-player) [![npm package](http://img.shields.io/npm/v/web-media-player.svg?style=flat)](https://www.npmjs.org/package/web-media-player)

This application allows you to control a simple media player via a web
interface.  I wrote it so that I could play video files on my Raspberry Pi.

This could really use some AJAX features - right now the state is only
refreshed when a new page is requested.  I might work on this in the future.

## Getting started

- [Install node.js](https://github.com/joyent/node/wiki/Installation).

- `git clone https://github.com/nylen/node-web-media-player.git`
  (or `npm install web-media-player`)

- `cd node-web-media-player` and `npm install`

- Copy one of the example config files to `config/default.yml` and edit as
  needed.

- `node server.js`

## Configuration settings

- **player.mediaPath** - the root path for your media files.

- **player.commands.start** - the command that should be used to run the media
  player for a file.  This should be a command-line media player like `mplayer`
  or `omxplayer`.  Use `%f` for the filename.

- **player.commands.kill** - the command that should be used to kill the media
  player.  This is only used as a last resort if sending
  **player.controls.exit** doesn't work.

- **player.controls.(play|pause|exit)** - the keypresses that should be sent to
  the `stdin` of the media player process to perform the desired action.  This
  should work as if you had started the media player on the command line and
  pressed the specified key(s).  **player.controls.exit** should stop the
  player and cause the process to exit.

- **player.controls.seek** - a dictionary where the keys are positive or
  negative numbers of seconds (given as strings), and the values are the key
  sequences needed to make the media player seek by the given number of
  seconds.

- **player.exitTimeout** - when **player.controls.exit** is sent, wait for this
  amount of time in milliseconds.  If the player process has not exited by
  then, kill it.  If specified, **player.commands.kill** will be used.
  Otherwise, the player process will be sent a `SIGTERM` (which does not seem
  to work with `omxplayer`).
