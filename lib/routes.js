var log = require('./logger');

module.exports = function(app, config, listen) {
    app.get('/', function(req, res) {
        res.render('index.html');
    });

    listen();
};
