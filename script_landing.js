var INFO_SECTIONS = ['about-page', 'faqs-page', 'terms-page', 'privacy-page'];

function isLandingPage() {
    return !!document.getElementById('landing-page');
}

function isGuestDashboardPage() {
    return !!document.getElementById('guest-main-content');
}

function getInfoHomeElement() {
    return document.getElementById('landing-page') || document.getElementById('guest-main-content');
}

function getCurrentPageFile() {
    if (isLandingPage()) {
        var path = window.location.pathname.split('/').pop() || '';
        if (!path || path === 'petfinder' || path === 'index.php') return 'landing.html';
        return path;
    }
    if (isGuestDashboardPage()) return 'guest-dashboard.html';
    var path = window.location.pathname.split('/').pop() || 'landing.html';
    return path || 'landing.html';
}

function resolveLandingHtmlUrl() {
    if (window.petfinderUrl) return window.petfinderUrl('landing.html');
    return 'landing.html';
}

function infoSectionsReady() {
    return !!document.getElementById('about-page');
}

function updateHistoryHash(sectionId) {
    if (!window.history || !window.history.replaceState) return;
    var base = window.location.pathname + window.location.search;
    if (sectionId) {
        window.history.replaceState(null, '', base + '#' + sectionId);
    } else {
        window.history.replaceState(null, '', base);
    }
}

function showInfoSection(sectionId) {
    var home = getInfoHomeElement();
    INFO_SECTIONS.forEach(function (id) {
        var section = document.getElementById(id);
        if (!section) return;
        var isActive = id === sectionId;
        if (isActive) {
            section.style.display = 'block';
            section.removeAttribute('hidden');
            section.classList.add('is-active');
        } else {
            section.style.display = 'none';
            section.setAttribute('hidden', '');
            section.classList.remove('is-active');
        }
    });

    if (home) {
        if (sectionId) {
            home.style.display = 'none';
            home.setAttribute('hidden', '');
            home.classList.add('is-hidden');
        } else {
            home.style.display = 'block';
            home.removeAttribute('hidden');
            home.classList.remove('is-hidden');
        }
    }

    document.body.classList.toggle('info-page-active', !!sectionId);
    window.scrollTo(0, 0);
}

function goToInfoPage(sectionId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    if (isLandingPage() && document.getElementById(sectionId)) {
        showInfoSection(sectionId);
        updateHistoryHash(sectionId);
        return false;
    }

    if (isGuestDashboardPage()) {
        window.location.href = resolveLandingHtmlUrl() + '#' + sectionId;
        return false;
    }

    window.location.href = resolveLandingHtmlUrl() + '#' + sectionId;
    return false;
}

function openInfoSection(sectionId, event) {
    return goToInfoPage(sectionId, event);
}

function goBackToInfoHome() {
    showInfoSection(null);
    updateHistoryHash(null);
}

function goBackToLandingHome() {
    goBackToInfoHome();
}

function initInfoFromHash() {
    if (!infoSectionsReady()) return;

    var hash = (window.location.hash || '').replace('#', '');
    if (INFO_SECTIONS.indexOf(hash) !== -1) {
        showInfoSection(hash);
    } else {
        showInfoSection(null);
    }
}

function wireInfoLinks() {
    var selector = '.site-footer a[href*="#about-page"], .site-footer a[href*="#faqs-page"], .site-footer a[href*="#terms-page"], .site-footer a[href*="#privacy-page"], .navbar a[href*="#about-page"], .navbar a[href*="#faqs-page"]';

    document.querySelectorAll(selector).forEach(function (link) {
        if (link.dataset.infoBound === 'true') return;

        link.addEventListener('click', function (event) {
            var href = link.getAttribute('href') || '';
            var hashIndex = href.indexOf('#');
            if (hashIndex === -1) return;

            var hash = href.slice(hashIndex + 1);
            if (INFO_SECTIONS.indexOf(hash) === -1) return;

            goToInfoPage(hash, event);
        });

        link.dataset.infoBound = 'true';
    });
}

function bootLandingInfoPages() {
    initInfoFromHash();
    wireInfoLinks();
}

document.addEventListener('DOMContentLoaded', function () {
    wireLandingAdminPortal();
    wireLandingLoginNotice();
    bootLandingInfoPages();
    window.addEventListener('hashchange', initInfoFromHash);
    window.addEventListener('pageshow', initInfoFromHash);

    if (typeof updateLandingAuthNotice === 'function') {
        updateLandingAuthNotice();
    }
});

function wireLandingAdminPortal() {
    var adminBtn = document.querySelector('.landing-admin-portal-btn');
    if (!adminBtn) return;

    adminBtn.addEventListener('click', function (event) {
        event.preventDefault();

        if (typeof isCurrentUserAdmin === 'function' && isCurrentUserAdmin()) {
            window.location.href = 'admin-reports.html';
            return;
        }

        window.location.href = 'admin-auth.html';
    });
}

function wireLandingLoginNotice() {
    var noticeBtn = document.querySelector('.landing-notice-login-btn');
    if (!noticeBtn || noticeBtn.dataset.bound === 'true') return;

    noticeBtn.addEventListener('click', function () {
        window.location.href = 'auth.html';
    });
    noticeBtn.dataset.bound = 'true';
}
