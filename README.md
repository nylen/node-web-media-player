# Node.js web media player

This application allows you to control a simple media player via a web
interface.  I wrote it so that I could play video files on my Raspberry Pi.

Yes, it's ugly, and just barely functional.  I might fix that in the future.

## Getting started

- [Install node.js](https://github.com/joyent/node/wiki/Installation).

- `git clone https://github.com/nylen/node-web-media-player.git`

- `cd node-web-media-player` and `npm install`

- Copy `example_config.js` to `config.js` and edit as needed.

- `node bin/start-server.js`

## Configuration settings

- **mediaPath** - the root path for your media files.

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

- **player.exitTimeout** - when **player.controls.exit** is sent, wait for this
  amount of time in milliseconds.  If the player process has not exited by
  then, kill it.  If specified, **player.commands.kill** will be used.
  Otherwise, the player process will be sent a `SIGTERM` (which does not seem
  to work with `omxplayer`).
