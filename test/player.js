var fs    = require('fs'),
    lib   = require('./lib'),
    mocha = require('mocha'),
    must  = require('must'),
    path  = require('path'),
    url   = require('url');

describe('web-media-player', function() {
    var browser    = lib.createBrowser(),
        mediaPath  = 'test/media',
        playerFile = 'test/bin/dummy-player-status.txt',
        quitFile   = 'test/bin/dummy-exit-on-quit.txt';

    fs.writeFileSync(quitFile, 'true');

    function assertControlLink(text, href) {
        href = url.resolve(browser.location.href, '/test/control/' + href);
        var links = browser.queryAll('#controls a');
        links = links.filter(function(l) {
            return l.textContent.trim() == text;
        });
        if (!links.length) {
            throw new Error('Could not find link with text: ' + text);
        }
        var link = links[0];
        links = links.filter(function(l) {
            return l.href == href;
        });
        if (!links.length) {
            link.href.must.equal(href);
        }
    }

    function expectState(opts) {
        var dirLinks  = browser.queryAll('#directories li a.pathname'),
            fileLinks = browser.queryAll('#files li a.pathname'),
            getText   = browser.text.bind(browser);

        var dir     = path.join(mediaPath, opts.path),
            entries = fs.readdirSync(dir),
            dirs    = [],
            files   = [];

        entries.sort(function(a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });

        entries.forEach(function(f) {
            var stat = fs.statSync(path.join(dir, f));
            if (stat.isDirectory()) {
                dirs.push(f);
            } else {
                files.push(f);
            }
        });

        dirLinks .map(getText).must.eql(dirs);
        fileLinks.map(getText).must.eql(files);

        browser.text('#browse-path').must.equal(
            opts.path == '/' ? '(Root directory)' : opts.path);

        if (opts.playing) {
            browser.text('#current-filename').must.equal(opts.playing);
        }

        if (opts.player) {
            var playerStatus = fs.readFileSync(playerFile, 'utf8').split(':');
            playerStatus.must.have.length(2);
            playerStatus[0].must.equal(opts.player);
            if (opts.playing) {
                playerStatus[1].must.equal(path.resolve(mediaPath, opts.playing));
            }

            if (opts.player == 'finished' || opts.player == 'goodbye cruel world') {
                must(browser.query('#controls')).not.exist();
                must(browser.query('#current-filename')).not.exist();
            } else {
                if (opts.player == 'paused') {
                    assertControlLink('Play', 'play');
                } else {
                    assertControlLink('Pause', 'pause');
                }
                assertControlLink('Seek forward 10s', 'seek?n=10');
                assertControlLink('Seek forward 60s', 'seek?n=60');
                assertControlLink('Seek back 10s', 'seek?n=-10');
                assertControlLink('Seek back 60s', 'seek?n=-60');
                assertControlLink('Stop', 'exit');
            }
        }
    }

    before(function(done) {
        this.timeout(10000);
        lib.startServer(done);
    });

    after(function(done) {
        this.timeout(5000);
        lib.closeServer(done);
    });

    it('allows logging in', function(done) {
        this.timeout(10000);

        browser.visit(lib.baseUrl + '/', function(err) {
            must(err && err.message).not.exist();
            browser.url.must.equal(lib.baseUrl + '/test/login');

            browser
            .fill('#username', lib.username)
            .fill('#password', lib.password)
            .pressButton('#login-button', function() {
                browser.url.must.equal(lib.baseUrl + '/test/browse');

                browser.text('title').must.equal('Media Player');
                browser.text('#current-username').must.equal('test');
                done();
            });
        });
    });

    it('shows directories and files', function(done) {
        expectState({
            path : '/'
        });
        done();
    });

    it('allows browsing to subdirectories', function(done) {
        browser.clickLink('folder1', function(err) {
            must(err && err.message).not.exist();
            expectState({
                path : 'folder1/'
            });
            done();
        });
    });

    it('allows browsing to empty nested subdirectories', function(done) {
        browser.clickLink('folder1-1', function(err) {
            must(err && err.message).not.exist();
            expectState({
                path : 'folder1/folder1-1/'
            });
            done();
        });
    });

    it('allows browsing to non-empty nested subdirectories', function(done) {
        browser.visit(lib.baseUrl + '/test/browse/folder1/folder1-2', function(err) {
            must(err && err.message).not.exist();
            expectState({
                path : 'folder1/folder1-2/'
            });
            done();
        });
    });

    it('provides a link to the parent directory', function(done) {
        browser.clickLink('#up', function(err) {
            must(err && err.message).not.exist();
            expectState({
                path : 'folder1/'
            });
            done();
        });
    });

    it('plays media files', function(done) {
        browser.clickLink('file1.txt', function(err) {
            must(err && err.message).not.exist();
            expectState({
                path    : 'folder1/',
                playing : 'folder1/file1.txt',
                player  : 'started'
            });
            done();
        });
    });

    it('(zombie.js is broken)', function(done) {
        // workaround for https://github.com/assaf/zombie/pull/454
        // this forces the Referer header to be reset
        browser.visit(lib.baseUrl + '/test/browse/folder1', function(err) {
            must(err && err.message).not.exist();
            expectState({
                path : 'folder1/'
            });
            done();
        });
    });

    it('pauses media files', function(done) {
        browser.clickLink('Pause', function(err) {
            must(err && err.message).not.exist();
            expectState({
                path    : 'folder1/',
                playing : 'folder1/file1.txt',
                player  : 'paused'
            });
            done();
        });
    });

    it('resumes playing', function(done) {
        browser.clickLink('Play', function(err) {
            must(err && err.message).not.exist();
            expectState({
                path    : 'folder1/',
                playing : 'folder1/file1.txt',
                player  : 'playing'
            });
            done();
        });
    });

    [10, 60, -10, -60].forEach(function(n) {
        var title = (n > 0 ? 'forward ' : 'back ') + Math.abs(n) + 's';
        it('seeks ' + title, function(done) {
            browser.clickLink('Seek ' + title, function(err) {
                must(err && err.message).not.exist();
                expectState({
                    path    : 'folder1/',
                    playing : 'folder1/file1.txt',
                    player  : 'seek ' + n
                });
                done();
            });
        });
    });

    it('stops playing', function(done) {
        browser.clickLink('Stop', function(err) {
            must(err && err.message).not.exist();
            expectState({
                path   : 'folder1/',
                player : 'finished'
            });
            done();
        });
    });

    it('plays files from subdirectories', function(done) {
        this.timeout(5000);
        // again, visiting directly rather than clicking a link to make
        // Zombie.js behave
        browser.visit(lib.baseUrl + '/test/browse/folder1/folder1-2', function(err) {
            must(err && err.message).not.exist();
            expectState({
                path : 'folder1/folder1-2/'
            });
            browser.clickLink('file1.txt', function(err) {
                must(err && err.message).not.exist();
                expectState({
                    path    : 'folder1/folder1-2/',
                    playing : 'folder1/folder1-2/file1.txt',
                    player  : 'started'
                });
                done();
            });
        });
    });

    it('kills the player if it does not exit cleanly', function(done) {
        fs.writeFileSync(quitFile, 'false');
        browser.clickLink('Stop', function(err) {
            must(err && err.message).not.exist();
            expectState({
                path   : 'folder1/folder1-2/',
                player : 'goodbye cruel world'
            });
            fs.writeFileSync(quitFile, 'true');
            done();
        });
    });
});
