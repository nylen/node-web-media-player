var qs   = require('querystring'),
    swig = require('swig');

function setFilter(name, filter, safe) {
    if (safe) filter.safe = true;
    swig.setFilter(name, filter);
}

exports.setFilters = function() {
    setFilter('set', function(input, param, value) {
        input[param] = value;
        return qs.stringify(input);
    });

    setFilter('unset', function(input, param) {
        delete input[param];
        return qs.stringify(input);
    });

    setFilter('json', function(input) {
        return JSON.stringify(input);
    }, true);

    setFilter('s', function(input) {
        return ('' + input == 1 ? '' : 's');
    });

    setFilter('es', function(input) {
        return ('' + input == 1 ? '' : 'es');
    });
};
