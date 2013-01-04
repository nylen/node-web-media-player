module.exports = {
    'mediaPath' : '/media/htpc/media',
    'player' : {
        'commands' : {
            'start' : 'DISPLAY=:0 omxplayer "%f"',
            'kill'  : 'killall omxplayer.bin',
        },
        'controls' : {
            'play'  : ' ',
            'pause' : ' ',
            'exit'  : 'q',
            'seek'  : {
                // Escape sequences obtained using xxd command
                '-30'  : '\x1b\x5b\x44', // left arrow
                '+30'  : '\x1b\x5b\x43', // right arrow
                '-600' : '\x1b\x5b\x42', // down arrow
                '+600' : '\x1b\x5b\x41'  // up arrow
            }
        },
        'exitTimeout' : 500
    }
};
