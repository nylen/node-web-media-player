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

exports.wrap = function(getPrefix, func) {
    if (typeof getPrefix != 'function') {
        var msg = getPrefix;
        getPrefix = function() {
            return msg;
        };
    }

    return function() {
        var args    = arguments,
            that    = this,
            prefix  = getPrefix.apply(that, args);
            wrapper = {};

        levels.forEach(function(level) {
            wrapper[level] = function(msg) {
                msg = (prefix ? prefix + ': ' : '') + msg;
                exports[level].apply(
                    this,
                    [msg].concat([].slice.call(arguments, 1)));
            };
        });

        return func.apply(that, [wrapper].concat([].slice.call(args)));
    };
};
