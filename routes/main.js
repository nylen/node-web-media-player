var log = require('../lib/logger');

exports.setRoutes = function(app, config, listen) {
    app.get('/', function(req, res) {
        res.render('index.html');
    });

    listen();
};
