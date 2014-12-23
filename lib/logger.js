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

exports._output = function(level, msg) {
    console.error(level + ':', msg);
};

levels.forEach(function(level) {
    exports[level] = function(msg) {
        exports._output(
            level,
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

exports.prefix = function() {
    var prefix  = util.format.apply(this, arguments),
        wrapper = {};

    levels.forEach(function(level) {
        wrapper[level] = function(msg) {
            msg = (prefix ? prefix + ': ' : '') + msg;
            exports[level].apply(
                this,
                [msg].concat([].slice.call(arguments, 1)));
        };
    });

    return wrapper;
};
