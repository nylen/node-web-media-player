var qs = require('querystring');

exports.set = function(input, param, value) {
    input[param] = value;
    return qs.stringify(input);
};

exports.unset = function(input, param) {
    delete input[param];
    return qs.stringify(input);
};

exports.s = function(input) {
    return ('' + input == 1 ? '' : 's');
};

exports.es = function(input) {
    return ('' + input == 1 ? '' : 'es');
};
