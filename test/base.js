var lib   = require('./lib'),
    mocha = require('mocha'),
    must  = require('must');

describe('Site template', function() {
    var browser = lib.createBrowser(),
        sessionId;

    before(function(done) {
        this.timeout(10000);
        lib.startServer(done);
    });

    beforeEach(function() {
        lib.clearRedirects();
    });

    after(function(done) {
        lib.closeServer(done);
    });

    it('starts with an empty database', function(done) {
        lib.ensureConnected(function() {
            lib.db.collectionNames(function(err, items) {
                must(err).not.exist();
                items.must.eql([]);
                done();
            });
        });
    });

    it('shows the login page', function(done) {
        this.timeout(10000);

        browser.visit(lib.baseUrl + '/', { duration : 10000 }, function(err) {
            must(err).not.exist();
            browser.url.must.equal(lib.baseUrl + '/test/login');
            lib.redirects.must.eql([
                lib.baseUrl + '/test',
                lib.baseUrl + '/test/login'
            ]);

            browser.text('title').must.equal('Log in');
            browser.text('div.navbar div.container a.brand').must.equal('Site name');

            lib.db.collectionNames(function(err, items) {
                must(err).not.exist();

                items.sort(function(a, b) {
                    if (a.name < b.name) {
                        return -1;
                    } else {
                        return 1;
                    }
                });
                items.must.eql([
                    { name : 'test-connect-sessions.sessions' },
                    { name : 'test-connect-sessions.system.indexes' }
                ]);

                lib.db.collection('sessions').find().toArray(function(err, results) {
                    must(err).not.exist();
                    results.must.have.length(1);
                    sessionId = results[0]._id;
                    JSON.parse(results[0].session).must.eql({
                        cookie : {
                            originalMaxAge : null,
                            expires        : null,
                            httpOnly       : true,
                            path           : '/'
                        },
                        passport : {},
                        flash    : {},
                        returnTo : '/test'
                    });

                    done();
                });
            });
        });
    });

    it('allows logging in', function(done) {
        browser
        .fill('#username', lib.username)
        .fill('#password', lib.password)
        .pressButton('#login-button', function() {
            browser.url.must.equal(lib.baseUrl + '/test');
            lib.redirects.must.eql([
                lib.baseUrl + '/test'
            ]);

            browser.text('title').must.equal('Page title');
            browser.text('#content').must.equal('Index page content');
            browser.text('#current-username').must.equal('test');

            lib.db.collection('sessions').find().toArray(function(err, results) {
                must(err).not.exist();
                results.must.have.length(1);
                results[0].must.have.property('_id', sessionId);
                JSON.parse(results[0].session).must.eql({
                    cookie : {
                        originalMaxAge : null,
                        expires        : null,
                        httpOnly       : true,
                        path           : '/'
                    },
                    passport : {
                        user : 'test'
                    },
                    flash    : {},
                    returnTo : '/test'
                });

                done();
            });
        });
    });

    it('allows logging back out', function(done) {
        browser.clickLink('Log out', function(err) {
            must(err).not.exist();
            browser.url.must.equal(lib.baseUrl + '/test/login');
            // TODO: why does Zombie set referrer to / ?  Chrome uses /test
            // instead which seems more correct
            lib.redirects.must.eql([
                lib.baseUrl + '/',
                lib.baseUrl + '/test',
                lib.baseUrl + '/test/login'
            ]);

            browser.text('title').must.equal('Log in');

            lib.db.collection('sessions').find().toArray(function(err, results) {
                must(err).not.exist();
                results.must.have.length(1);
                results[0].must.have.property('_id', sessionId);
                JSON.parse(results[0].session).must.eql({
                    cookie : {
                        originalMaxAge : null,
                        expires        : null,
                        httpOnly       : true,
                        path           : '/'
                    },
                    passport : {},
                    flash    : {},
                    returnTo : '/test'
                });

                done();
            });
        });
    });
});
