module.exports = {
    'mediaPath': '/media/htpc/media',
    'player': {
        'commands': {
            'start': 'DISPLAY=:0 omxplayer "%f"',
            'kill': 'killall omxplayer.bin',
        },
        'controls': {
            'play': ' ',
            'pause': ' ',
            'exit': 'q'
        },
        'exitTimeout': 500
    }
};
