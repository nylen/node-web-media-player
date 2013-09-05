var log = require('../lib/logger');

exports.setRoutes = function(app, config, listen) {
    app.get('/', app.ensureAuthenticated, function(req, res) {
        res.render('index.html');
    });

    require('./auth').setRoutes(app, config);

    listen();
};
