(function () {
    'use strict';

    var BASE = '/petfinder/';
    var HOME = 'http://localhost' + BASE;

    function currentPage() {
        var page = window.location.pathname.split('/').pop() || '';
        if (!page || page === 'index.php') return 'landing.html';
        return page;
    }

    function goHome(page) {
        var target = HOME + (page || 'landing.html') + window.location.search + window.location.hash;
        window.location.replace(target);
    }

    var port = String(window.location.port || '');
    var protocol = window.location.protocol;
    var host = window.location.hostname;

    if (protocol === 'file:' || port === '5500' || port === '5501' || port === '5502') {
        goHome(currentPage());
        return;
    }

    if (host === 'localhost' || host === '127.0.0.1') {
        if (!window.location.pathname.toLowerCase().startsWith(BASE)) {
            goHome(currentPage());
        }
    }

    window.PETFINDER_BASE = BASE;
    window.petfinderUrl = function (page) {
        page = String(page || '').replace(/^\//, '');
        return BASE + page;
    };
})();
