var util = require('util');

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

levels.forEach(function(level) {
    exports[level] = function(msg) {
        console.log(
            level + ':',
            util.format.apply(
                this,
                [msg].concat([].slice.call(arguments, 1))));
    };
});
