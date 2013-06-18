var levels = [
    'silly',
    'input',
    'verbose',
    'prompt',
    'debug',
    'http',
    'info',
    'data',
    'help',
    'warn',
    'error'
];

for (var i = 0; i < levels.length; i++) {
    (function(level) {
        exports[level] = function() {
            console.log.apply(this,
                [level + ':'].concat([].slice.call(arguments)));
        };
    })(levels[i]);
}
