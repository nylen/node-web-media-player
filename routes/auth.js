var passport = require('passport');

exports.setRoutes = function(app, config) {
    app.get('/login', function(req, res) {
        res.render('login.html', { errors: req.flash('error') });
    });

    app.post('/login',
        passport.authenticate('local', {
            failureRedirect : app.vars.namespace + '/login',
            failureFlash    : true
        }),
        function(req, res) {
            res.redirect(req.session.returnTo || app.vars.namespace);
        }
    );

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect(req.header('Referrer') || app.vars.namespace);
    });
};
