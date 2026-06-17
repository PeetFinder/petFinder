
function filterBreeds(speciesSelectId, breedSelectId) {
    const speciesSelect = document.getElementById(speciesSelectId);
    const breedEl = document.getElementById(breedSelectId);
    const selectedSpecies = speciesSelect.value;

    const breedData = {
        'Dog': ['Aspin', 'Golden Retriever', 'Shih Tzu', 'German Shepherd', 'Labrador Retriever', 'Poodle', 'Pug', 'Chihuahua'],
        'Cat': ['Puspin', 'Siamese', 'Persian', 'Maine Coon', 'British Shorthair']
    };

    // New UI supports:
    // - input[list] + datalist for typing
    // - select for legacy pages
    const datalistId = breedEl && breedEl.getAttribute ? breedEl.getAttribute('list') : null;

    if (breedEl && datalistId) {
        const datalistEl = document.getElementById(datalistId);
        if (!datalistEl) return;

        // reset
        datalistEl.innerHTML = '';

        if (selectedSpecies !== 'Others' && breedData[selectedSpecies]) {
            breedData[selectedSpecies].forEach(function (breed) {
                const option = document.createElement('option');
                option.value = breed;
                datalistEl.appendChild(option);
            });
        }

        // keep user-typed value only if it matches the new suggestions.
        if (selectedSpecies === 'Others') {
            // allow free-typing; keep value
            return;
        }

        if (breedEl.value && breedData[selectedSpecies] && !breedData[selectedSpecies].includes(breedEl.value)) {
            breedEl.value = '';
        }

        return;
    }

    // Legacy <select> fallback
    if (!breedEl) return;

    const breedSelect = breedEl;
    breedSelect.innerHTML = '<option value="" selected disabled>Select Breed</option>';

    if (selectedSpecies === 'Others') {
        return;
    }

    if (breedData[selectedSpecies]) {
        breedData[selectedSpecies].forEach(function (breed) {
            const option = document.createElement('option');
            option.value = breed;
            option.textContent = breed;
            breedSelect.appendChild(option);
        });
    }
}



function redirectToOwnerHomepageAfterReport() {
    const form = document.getElementById('lostPetForm');
    const breedSelect = document.getElementById('reportBreed');

    if (form) form.reset();
    if (breedSelect) {
        // <select> legacy reset
        if (typeof breedSelect.innerHTML === 'string') {
            breedSelect.innerHTML = '<option value="" selected disabled>Select Breed</option>';
        }

        // <input list> reset
        if (breedSelect.tagName === 'INPUT') {
            const datalistId = breedSelect.getAttribute('list');
            const datalistEl = datalistId ? document.getElementById(datalistId) : null;
            if (datalistEl) datalistEl.innerHTML = '';
            breedSelect.value = '';
        }
    }

    const warningEl = document.getElementById('charWarning');
    if (warningEl) warningEl.style.display = 'none';

    if (typeof clearHomepageSearch === 'function') {
        clearHomepageSearch();
    }

    ensureUserWelcomeBanner();
    showSection('main-page');

    if (typeof syncHomepageUserAccountUI === 'function') {
        syncHomepageUserAccountUI('main-page');
    }
    if (typeof renderOwnerNotificationsPanel === 'function') {
        renderOwnerNotificationsPanel();
    }

    openNavNotificationDropdown();
}

function openNavNotificationDropdown() {
    closeNavAccountDropdown();
    const dropdown = document.getElementById('navNotifDropdown');
    const bellBtn = document.getElementById('navNotifBellBtn');
    if (!dropdown || !bellBtn) return;
    dropdown.style.display = 'block';
    bellBtn.setAttribute('aria-expanded', 'true');
}

function readReportPhotoFile() {
    return new Promise(function (resolve) {
        const input = document.getElementById('reportPhoto');
        if (!input || !input.files || !input.files[0]) {
            resolve('');
            return;
        }

        const file = input.files[0];
        if (!file.type || !String(file.type).startsWith('image/')) {
            resolve('');
            return;
        }

        const reader = new FileReader();
        reader.onload = function () {
            resolve(reader.result || '');
        };
        reader.onerror = function () {
            resolve('');
        };
        reader.readAsDataURL(file);
    });
}

function submitLostPetReport(event) {
    if (event) event.preventDefault();

    const petName = document.getElementById('reportPetName').value;
    const species = document.getElementById('reportSpecies').value;
    const breed = document.getElementById('reportBreed').value;
    const location = document.getElementById('reportLocation').value;
    const dateInput = document.getElementById('reportDate').value;
    const reportDetails = document.getElementById('reportDetails')?.value;

    const detailsLen = (reportDetails || '').length;
    const warningEl = document.getElementById('charWarning');
    if (detailsLen > 1500) {
        if (warningEl) warningEl.style.display = 'block';
        return;
    }

    readReportPhotoFile().then(function (photoData) {
        createLostPetReport(petName, species, breed, location, dateInput, reportDetails, photoData)
            .then(function () {
                redirectToOwnerHomepageAfterReport();
            })
            .catch(function () {
                // Stay on report form when database save fails.
            });
    });
}

function getSpeciesBadgeText(species) {
    return String(species || 'PET').trim().toUpperCase().slice(0, 8);
}

function getSpeciesBadgeHtml(species) {
    return '<span class="pet-species-fallback">' + getSpeciesBadgeText(species) + '</span>';
}

function getSpeciesMarkerLabel(species) {
    const text = String(species || 'P').trim();
    return text ? text.charAt(0).toUpperCase() : 'P';
}

function getReportCardImageHtml(report) {
    if (report && report.photo) {
        return '<img src="' + report.photo + '" alt="' + (report.name || 'Lost pet') + '" class="pet-report-photo">';
    }
    return getSpeciesBadgeHtml(report.species);
}


function displayAuthenticatedUser(fullName, email, location, contact) {
    const banner = document.getElementById('user-welcome-banner');
    const welcomeText = document.getElementById('user-welcome-text');
    const emailText = document.getElementById('user-welcome-email');
    const navAccount = document.getElementById('nav-account');
    const navAuthBtn = document.getElementById('nav-auth-btn');
    const existing = getCurrentUser();

    const currentUser = {
        name: fullName,
        email: email,
        location: location,
        contact: contact !== undefined ? contact : (existing && existing.contact) || ''
    };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    if (banner && welcomeText && emailText) {
        welcomeText.textContent = `Welcome back, ${fullName}!`;
        emailText.textContent = email ? `Signed in as ${email}` : 'You are now signed in and can see the latest reports.';
        banner.style.display = 'block';
    }

    if (navAccount && navAuthBtn) {
        const initials = (fullName || 'U').split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase();
        const initialsEl = document.getElementById('nav-user-initials');
        if (initialsEl) initialsEl.textContent = initials;
        navAccount.classList.remove('d-none', 'nav-user-logout-hidden');
        navAccount.classList.add('d-flex', 'nav-user-visible');
        const navUserBtn = document.getElementById('navUserBtn');
        if (navUserBtn) navUserBtn.title = fullName + (email ? ' — ' + email : '');
        bindNavAccountDropdown();

        navAuthBtn.classList.remove('auth-hidden');
        navAuthBtn.textContent = 'Logout';
        navAuthBtn.onclick = logoutUser;
        
        const loginBtn = document.getElementById('nav-login-btn');
        const registerBtn = document.getElementById('nav-register-btn');
        if (loginBtn) loginBtn.classList.add('auth-hidden');
        if (registerBtn) registerBtn.classList.add('auth-hidden');
    }

    setTimeout(positionUserBannerAboveHero, 0);

    displayMyAccountProfile();
}

function handleRegister(event) {
    handleSecureRegister(event);
}

function handleLogin(event) {
    handleSecureLogin(event);
}

function redirectToRegisterForm() {
    if (typeof toggleAuthForm === 'function') {
        toggleAuthForm('register');
        setTimeout(function () {
            const input = document.getElementById('registerFullName')
                || document.getElementById('regName');
            if (input) {
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                input.focus();
            }
        }, 50);
        return;
    }

    if (document.getElementById('auth-page')) {
        if (typeof handleRegisterTrigger === 'function') {
            handleRegisterTrigger({ preventDefault: function () {} });
        } else {
            showSection('auth-page');
        }
        return;
    }

    window.location.href = 'auth.html#register';
}

function handleLoginTrigger(event) {
    event.preventDefault();
    if (!hasRegisteredAccount()) {
        redirectToRegisterForm();
        return;
    }
    if (document.getElementById('auth-page')) {
        showSection('auth-page');
        if (typeof focusLoginForm === 'function') focusLoginForm();
        return;
    }
    window.location.href = 'auth.html';
}

function handleRegisterTrigger(event) {
    event.preventDefault();
    showSection('auth-page');
    setTimeout(() => {
        const input = document.getElementById('registerFullName');
        if (input) {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            input.focus();
        }
    }, 50);
}

function replaceCombinedAuthButtons() {
    const authButtons = Array.from(document.querySelectorAll('button')).filter((button) => {
        const onclickAttr = button.getAttribute('onclick');
        return onclickAttr && onclickAttr.includes("showSection('auth-page')");
    });
    authButtons.forEach((button) => {
        if (button.id === 'nav-auth-btn') return;
        const text = button.textContent.trim();
        if (text.includes('Login / Register') || text.includes('LOG IN / REGISTER')) {
            const parent = button.parentElement;
            if (!parent) return;

            const loginBtn = button.cloneNode(true);
            loginBtn.id = 'page-login-button';
            loginBtn.textContent = 'Login';
            loginBtn.className = button.className;
            loginBtn.onclick = null;
            loginBtn.addEventListener('click', handleLoginTrigger);

            const registerBtn = button.cloneNode(true);
            registerBtn.id = 'page-register-button';
            registerBtn.textContent = 'Register';
            registerBtn.className = button.className;
            registerBtn.onclick = null;
            registerBtn.addEventListener('click', handleRegisterTrigger);

            const wrapper = document.createElement('div');
            wrapper.className = 'd-flex flex-wrap gap-3';
            wrapper.appendChild(loginBtn);
            wrapper.appendChild(registerBtn);

            button.replaceWith(wrapper);
        }
    });
}

function createNavActionButtons() {
    const authContainer = document.querySelector('#nav-auth-btn')?.parentElement;
    if (!authContainer) return;
    authContainer.classList.add('nav-action-group');

    let loginBtn = document.getElementById('nav-login-btn');
    if (!loginBtn) {
        loginBtn = document.createElement('button');
        loginBtn.id = 'nav-login-btn';
        loginBtn.type = 'button';
        loginBtn.className = 'btn btn-outline-sage fw-bold px-4';
        loginBtn.textContent = 'Login';
        authContainer.insertBefore(loginBtn, document.getElementById('nav-auth-btn'));
        loginBtn.addEventListener('click', handleLoginTrigger);
    }

    let registerBtn = document.getElementById('nav-register-btn');
    if (!registerBtn) {
        registerBtn = document.createElement('button');
        registerBtn.id = 'nav-register-btn';
        registerBtn.type = 'button';
        registerBtn.className = 'btn btn-sage fw-bold px-4';
        registerBtn.textContent = 'Register';
        authContainer.insertBefore(registerBtn, document.getElementById('nav-auth-btn'));
        registerBtn.addEventListener('click', handleRegisterTrigger);
    }
}

function updateNavAuthButtons() {
    const currentUser = getCurrentUser();
    const navAuthBtn = document.getElementById('nav-auth-btn');
    const loginBtn = document.getElementById('nav-login-btn');
    const registerBtn = document.getElementById('nav-register-btn');
    const navAccount = document.getElementById('nav-account');

    if (currentUser) {
        if (navAuthBtn) {
            navAuthBtn.classList.remove('auth-hidden');
            navAuthBtn.textContent = 'Logout';
            navAuthBtn.onclick = logoutUser;
        }
        if (loginBtn) loginBtn.classList.add('auth-hidden');
        if (registerBtn) registerBtn.classList.add('auth-hidden');
        if (navAccount) {
            navAccount.classList.remove('d-none', 'nav-user-logout-hidden');
            navAccount.classList.add('d-flex', 'nav-user-visible');
        }
    } else {
        if (navAuthBtn) {
            navAuthBtn.classList.add('auth-hidden');
            navAuthBtn.onclick = null;
        }
        if (loginBtn) loginBtn.classList.remove('auth-hidden');
        if (registerBtn) registerBtn.classList.remove('auth-hidden');
        if (navAccount) {
            navAccount.classList.remove('d-flex', 'nav-user-visible');
            navAccount.classList.add('d-none', 'nav-user-logout-hidden');
            closeNavAccountDropdown();
        }
    }
}

function attachLoginFormInterceptor() {
    const authForms = Array.from(document.querySelectorAll('#auth-page form'));
    const loginForm = authForms.find((form) => {
        const submit = form.querySelector('button[type="submit"]');
        return submit && submit.textContent.trim().toUpperCase() === 'LOG IN';
    });

    if (!loginForm) return;
    loginForm.addEventListener('submit', function (event) {
        handleSecureLogin(event);
    });
}

document.addEventListener('DOMContentLoaded', function () {
    positionUserBannerAboveHero();
    replaceCombinedAuthButtons();
    createNavActionButtons();
    
    const currentUser = getCurrentUser();
    if (currentUser) {
        const navAuthBtn = document.getElementById('nav-auth-btn');
        const loginBtn = document.getElementById('nav-login-btn');
        const registerBtn = document.getElementById('nav-register-btn');
        
        if (navAuthBtn) {
            navAuthBtn.classList.remove('auth-hidden');
            navAuthBtn.textContent = 'Logout';
            navAuthBtn.onclick = logoutUser;
        }
        if (loginBtn) loginBtn.classList.add('auth-hidden');
        if (registerBtn) registerBtn.classList.add('auth-hidden');
        
        displayMyAccountProfile();
    }
});

function positionUserBannerAboveHero() {
    const banner = document.getElementById('user-welcome-banner');
    const mainPage = document.getElementById('main-page');
    if (!banner || !mainPage) return;

    banner.classList.add('small-user-banner');

    const hero = mainPage.querySelector('.hero-banner');
    if (hero && hero.parentNode) {
        hero.parentNode.insertBefore(banner, hero);
    } else {
        mainPage.insertBefore(banner, mainPage.firstChild);
    }

}

function logoutUser() {
    const banner = document.getElementById('user-welcome-banner');
    const navAccount = document.getElementById('nav-account');
    const navAuthBtn = document.getElementById('nav-auth-btn');
    const loginBtn = document.getElementById('nav-login-btn');
    const registerBtn = document.getElementById('nav-register-btn');

    if (banner) banner.style.display = 'none';
    if (navAccount) {
        navAccount.classList.remove('d-flex', 'nav-user-visible');
        navAccount.classList.add('d-none', 'nav-user-logout-hidden');
        closeNavAccountDropdown();
    }

    if (loginBtn) loginBtn.classList.remove('auth-hidden');
    if (registerBtn) registerBtn.classList.remove('auth-hidden');
    if (navAuthBtn) {
        navAuthBtn.classList.add('auth-hidden');
        navAuthBtn.onclick = null;
    }

    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('petfinderLoggedIn');

    if (typeof refreshMapPinManagementUI === 'function') {
        refreshMapPinManagementUI();
    }

    if (document.getElementById('landing-page') && typeof showSection === 'function') {
        showSection('landing-page');
    } else if (typeof isStandaloneAppPage === 'function' && isStandaloneAppPage()) {
        window.location.href = 'index.html';
    } else if (typeof showSection === 'function') {
        showSection('landing-page');
    }
}

function getCurrentUser() {
    const userData = localStorage.getItem('currentUser');
    return userData ? JSON.parse(userData) : null;
}

const DEFAULT_ADMIN_ACCOUNTS = [
    { name: 'Eriane Admin', email: 'eriane_admin@petfinder.com', password: 'Kape!26' }
];

function getEmbeddedAdminEmailMap() {
    const emails = {
        'eriane_admin@gmail.com': true,
        'ethan_admin@petfinder.com': true,
        'ram_admin@petfinder.com': true,
        'tristan_admin@petfinder.com': true,
        'joycee_admin@petfinder.com': true,
        'admin@petfinder.com': true
    };

    DEFAULT_ADMIN_ACCOUNTS.forEach(function (account) {
        if (account && account.email) {
            emails[String(account.email).toLowerCase()] = true;
        }
    });

    try {
        JSON.parse(localStorage.getItem('petfinderAdminAccounts') || '[]').forEach(function (account) {
            if (account && account.email) {
                emails[String(account.email).toLowerCase()] = true;
            }
        });
    } catch (e) {}

    return emails;
}

function isEmbeddedAdminEmail(email) {
    const key = String(email || '').trim().toLowerCase();
    if (!key) return true;
    if (getEmbeddedAdminEmailMap()[key]) return true;
    return /_admin@petfinder\.com$/.test(key);
}

function isExcludedFromRegisteredUsersRecord(email) {
    return isEmbeddedAdminEmail(email);
}

function shouldShowInRegisteredClientsList(entry) {
    if (!entry || !entry.email) return false;
    if (isEmbeddedAdminEmail(entry.email)) return false;
    if (String(entry.role || 'user').toLowerCase() === 'admin') return false;
    return true;
}

function pruneEmbeddedAdminsFromRegisteredClients() {
    const key = 'petfinderRegisteredClients';
    try {
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        const cleaned = list.filter(function (c) {
            return shouldShowInRegisteredClientsList(c);
        });
        if (cleaned.length !== list.length) {
            localStorage.setItem(key, JSON.stringify(cleaned));
        }
    } catch (e) {}
}

function ensureDefaultAdminAccount() {
    const accountsKey = 'petfinderAdminAccounts';
    let accounts = [];

    try {
        accounts = JSON.parse(localStorage.getItem(accountsKey) || '[]');
    } catch (e) {
        accounts = [];
    }

    const byEmail = {};
    accounts.forEach(function (account) {
        if (account && account.email) {
            byEmail[String(account.email).toLowerCase()] = account;
        }
    });

    try {
        const legacy = JSON.parse(localStorage.getItem('petfinderAdminCredentials') || 'null');
        if (legacy && legacy.email) {
            const legacyKey = String(legacy.email).toLowerCase();
            if (!byEmail[legacyKey]) {
                byEmail[legacyKey] = legacy;
            }
        }
    } catch (e) {}

    const legacyErianeKey = 'eriane_admin@gmail.com';
    const erianeKey = 'eriane_admin@petfinder.com';
    if (byEmail[legacyErianeKey]) {
        if (!byEmail[erianeKey]) {
            byEmail[erianeKey] = Object.assign({}, byEmail[legacyErianeKey], { email: 'eriane_admin@petfinder.com' });
        }
        delete byEmail[legacyErianeKey];
    }

    const allowedEmails = {};
    DEFAULT_ADMIN_ACCOUNTS.forEach(function (def) {
        const key = String(def.email).toLowerCase();
        allowedEmails[key] = true;
        if (!byEmail[key]) {
            byEmail[key] = {
                name: def.name,
                email: def.email,
                password: def.password
            };
        } else {
            byEmail[key].name = def.name;
            byEmail[key].email = def.email;
            byEmail[key].password = def.password;
        }
    });

    accounts = Object.keys(byEmail)
        .filter(function (key) { return allowedEmails[key]; })
        .map(function (key) { return byEmail[key]; });
    localStorage.setItem(accountsKey, JSON.stringify(accounts));

    let users = JSON.parse(localStorage.getItem('petfinderUsers') || '[]');

    users = users.filter(function (u) {
        if (!u || !u.email) return true;
        if (String(u.role || '').toLowerCase() !== 'admin') return true;
        return !!allowedEmails[String(u.email).toLowerCase()];
    });

    accounts.forEach(function (admin) {
        if (!admin || !admin.email) return;

        const emailKey = String(admin.email).toLowerCase();
        const hasAdmin = users.some(function (u) {
            return u && u.email && String(u.email).toLowerCase() === emailKey;
        });

        if (!hasAdmin) {
            users.push({
                id: 'user_admin_' + emailKey.replace(/[^a-z0-9]/g, '_'),
                name: admin.name || admin.email,
                email: admin.email,
                role: 'admin',
                createdAt: new Date().toISOString()
            });
        }

        setAccountPassword(admin.email, admin.password);
    });

    localStorage.setItem('petfinderUsers', JSON.stringify(users));
    userAccounts = users;
}

function getAdminAccounts() {
    ensureDefaultAdminAccount();
    try {
        return JSON.parse(localStorage.getItem('petfinderAdminAccounts') || '[]');
    } catch (e) {
        return [];
    }
}

function getAdminCredentials() {
    const accounts = getAdminAccounts();
    return accounts.length ? accounts[0] : {};
}

function isCurrentUserAdmin() {
    try {
        const user = getCurrentUser();
        if (!user || !user.email) return false;
        if (String(user.role || '').toLowerCase() === 'admin') return true;
        const email = String(user.email).toLowerCase();
        const users = JSON.parse(localStorage.getItem('petfinderUsers') || '[]');
        return users.some(function (u) {
            return u && u.email && String(u.email).toLowerCase() === email && String(u.role).toLowerCase() === 'admin';
        });
    } catch (e) {
        return false;
    }
}

function logoutAdminSession() {
    const finish = function () {
        sessionStorage.removeItem('petfinderLoggedIn');
        localStorage.removeItem('currentUser');
        window.location.href = 'admin-auth.html';
    };

    if (typeof PetFinderAPI !== 'undefined' && typeof usePetFinderBackend === 'function' && usePetFinderBackend()) {
        PetFinderAPI.logout().finally(finish);
        return;
    }

    finish();
}

function showAdminLoginError(message) {
    let err = document.getElementById('adminLoginError');
    if (!err) {
        err = document.createElement('div');
        err.id = 'adminLoginError';
        err.className = 'alert alert-danger small py-2 mb-3';
        err.setAttribute('role', 'alert');
        const form = document.getElementById('adminLoginForm');
        const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
        if (form && submitBtn) {
            form.insertBefore(err, submitBtn);
        }
    }
    err.textContent = message;
    err.style.display = 'block';
}

function hideAdminLoginError() {
    const err = document.getElementById('adminLoginError');
    if (err) err.style.display = 'none';
}

function showLoginError(message) {
    let err = document.getElementById('loginError');
    if (!err) {
        err = document.createElement('div');
        err.id = 'loginError';
        err.className = 'alert alert-danger small py-2 px-3 mb-3 rounded-3 border-0';
        err.setAttribute('role', 'alert');
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.parentElement.insertBefore(err, loginForm);
        }
    }
    err.textContent = message;
    err.style.display = 'block';
}

function hideLoginError() {
    const err = document.getElementById('loginError');
    if (err) err.style.display = 'none';
}

function resolveAdminLoginIdentity(email, password) {
    ensureDefaultAdminAccount();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    const embeddedAdmin = getAdminAccounts().find(function (account) {
        return account &&
            account.email &&
            String(account.email).toLowerCase() === normalizedEmail &&
            account.password === password;
    });

    if (embeddedAdmin) {
        return {
            name: embeddedAdmin.name || embeddedAdmin.email,
            email: embeddedAdmin.email
        };
    }

    const users = JSON.parse(localStorage.getItem('petfinderUsers') || '[]');
    const adminUser = users.find(function (u) {
        return u && u.email &&
            String(u.email).toLowerCase() === normalizedEmail &&
            String(u.role || '').toLowerCase() === 'admin';
    });

    if (adminUser) {
        const passwords = getAccountPasswords();
        if (passwords[normalizedEmail] === password) {
            return {
                name: adminUser.name || adminUser.email,
                email: adminUser.email
            };
        }

        const registered = getRegisteredAccount();
        if (registered &&
            String(registered.email || '').toLowerCase() === normalizedEmail &&
            registered.password === password) {
            return {
                name: adminUser.name || registered.name,
                email: adminUser.email
            };
        }
    }

    return null;
}

function usePetFinderBackend() {
    return !!(window.PetFinderAPI && PetFinderAPI.ready && PetFinderAPI.useBackend);
}

function isWrongPreviewHost() {
    const port = String(window.location.port || '');
    const protocol = window.location.protocol;
    return protocol === 'file:' || port === '5500' || port === '5501' || port === '5502';
}

function getPetFinderSiteBase() {
    if (window.location.protocol === 'http:' && window.location.hostname === 'localhost' && !isWrongPreviewHost()) {
        if (window.location.pathname.toLowerCase().startsWith('/petfinder/')) {
            return window.location.origin + '/petfinder/';
        }
    }
    return 'http://localhost/petfinder/';
}

function whenBackendReady(callback) {
    if (!window.PetFinderAPI) {
        callback(false);
        return;
    }
    PetFinderAPI.init().then(function (ok) {
        callback(!!ok);
    }).catch(function () {
        callback(false);
    });
}

function requirePetFinderDatabase(onReady, onFail) {
    if (isWrongPreviewHost()) {
        return;
    }
    whenBackendReady(function (ok) {
        if (ok) {
            if (typeof onReady === 'function') onReady();
            return;
        }
        if (typeof onFail === 'function') onFail();
    });
}

function syncSessionFromBackend() {
    if (!usePetFinderBackend()) {
        return Promise.resolve();
    }
    return PetFinderAPI.me().then(function (res) {
        if (res.loggedIn && res.user) {
            sessionStorage.setItem('petfinderLoggedIn', 'true');
            localStorage.setItem('currentUser', JSON.stringify({
                name: res.user.name,
                email: res.user.email,
                location: res.user.location || '',
                contact: res.user.contact || '',
                role: res.user.role || 'user'
            }));
        }
    }).catch(function () {});
}

function initPetFinderBackend(callback) {
    whenBackendReady(function (ok) {
        if (!ok) {
            if (typeof callback === 'function') callback(false);
            return;
        }
        syncSessionFromBackend().finally(function () {
            if (typeof callback === 'function') callback(true);
        });
    });
}

function handleAdminLogin(event) {
    if (event) event.preventDefault();
    hideAdminLoginError();

    const email = (document.getElementById('adminLoginEmail')?.value || '').trim().toLowerCase();
    const password = document.getElementById('adminLoginPassword')?.value || '';

    if (!email || !password) {
        showAdminLoginError('Please enter admin email and password.');
        return;
    }

    requirePetFinderDatabase(function () {
        PetFinderAPI.adminLogin(email, password).then(function (res) {
            completeUserSession(
                res.user.name,
                res.user.email,
                res.user.location || 'Tanauan City, Batangas',
                res.user.contact || '',
                res.user.role || 'admin'
            );
            window.location.href = 'admin-reports.html';
        }).catch(function (err) {
            showAdminLoginError(err.message || 'Invalid admin credentials.');
        });
    });
}

function initAdminAuthPage() {
    if (!document.getElementById('adminLoginForm')) return;

    initPasswordToggleButtons();

    if (!usePetFinderBackend()) {
        ensureDefaultAdminAccount();
    }
    hideAdminLoginError();

    if (isUserSessionLoggedIn() && isCurrentUserAdmin()) {
        window.location.href = 'admin-reports.html';
    }
}




function displayMyAccountProfile() {
    const user = getCurrentUser();
    if (!user) return;

    const nameEl = document.getElementById('displayUserName');
    const emailEl = document.getElementById('displayUserEmail');
    const contactEl = document.getElementById('displayUserContact');
    const locationEl = document.getElementById('displayUserLocation');
    if (!nameEl && !emailEl && !contactEl && !locationEl) return;

    if (nameEl) nameEl.textContent = user.name || '--';
    if (emailEl) emailEl.textContent = user.email || '--';
    if (contactEl) contactEl.textContent = user.contact || '--';
    if (locationEl) locationEl.textContent = user.location || '--';

    const initials = (user.name || 'U').split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase();
    const avatarEl = document.getElementById('userAvatarLarge');
    if (avatarEl) avatarEl.textContent = initials;
}

function openMyAccountEditModal() {
    const user = getCurrentUser();
    if (!user) return;

    const nameInput = document.getElementById('editMyName');
    const emailInput = document.getElementById('editMyEmail');
    const contactInput = document.getElementById('editMyContact');
    const locationInput = document.getElementById('editMyLocation');
    if (nameInput) nameInput.value = user.name || '';
    if (emailInput) emailInput.value = user.email || '';
    if (contactInput) contactInput.value = user.contact || '';
    if (locationInput) locationInput.value = user.location || '';

    openNavAccountDropdown();
    showNavAccountEditMode();
}

function closeMyAccountEditModal() {
    showNavAccountViewMode();
}

function showNavAccountViewMode() {
    const viewMode = document.getElementById('navAccountViewMode');
    const editMode = document.getElementById('navAccountEditMode');
    if (viewMode) viewMode.style.display = 'block';
    if (editMode) editMode.style.display = 'none';
}

function showNavAccountEditMode() {
    const viewMode = document.getElementById('navAccountViewMode');
    const editMode = document.getElementById('navAccountEditMode');
    if (viewMode) viewMode.style.display = 'none';
    if (editMode) editMode.style.display = 'block';
}

function closeNavAccountDropdown() {
    const dropdown = document.getElementById('navAccountDropdown');
    const userBtn = document.getElementById('navUserBtn');
    if (dropdown) dropdown.style.display = 'none';
    if (userBtn) userBtn.setAttribute('aria-expanded', 'false');
    showNavAccountViewMode();
}

function openNavAccountDropdown() {
    closeNavNotificationDropdown();
    const dropdown = document.getElementById('navAccountDropdown');
    const userBtn = document.getElementById('navUserBtn');
    if (!dropdown || !userBtn) return;
    dropdown.style.display = 'block';
    userBtn.setAttribute('aria-expanded', 'true');
    displayMyAccountProfile();
}

function toggleNavAccountDropdown() {
    const dropdown = document.getElementById('navAccountDropdown');
    if (!dropdown) return;
    if (dropdown.style.display === 'block') {
        closeNavAccountDropdown();
    } else {
        openNavAccountDropdown();
    }
}

function bindNavAccountDropdown() {
    const userBtn = document.getElementById('navUserBtn');
    if (!userBtn || userBtn.dataset.bound === 'true') return;

    userBtn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        toggleNavAccountDropdown();
    });
    userBtn.dataset.bound = 'true';
}

function handleUpdateMyAccount(event) {
    event.preventDefault();

    const user = getCurrentUser();
    if (!user) return;

    const contact = sanitizeContactDigits(document.getElementById('editMyContact')?.value || user.contact || '');
    const contactError = getRegisterContactError(contact);
    if (contactError) {
        alert(contactError);
        return;
    }

    const updatedUser = {
        name: document.getElementById('editMyName').value.trim() || user.name,
        email: document.getElementById('editMyEmail').value.trim() || user.email,
        contact: contact,
        location: document.getElementById('editMyLocation').value.trim() || user.location
    };

    localStorage.setItem('currentUser', JSON.stringify(updatedUser));

    const registered = getRegisteredAccount();
    if (registered) {
        saveRegisteredAccount({
            name: updatedUser.name,
            email: updatedUser.email,
            contact: updatedUser.contact,
            location: updatedUser.location,
            password: registered.password || ''
        });
    }

    displayMyAccountProfile();
    displayAuthenticatedUser(updatedUser.name, updatedUser.email, updatedUser.location, updatedUser.contact);
    showNavAccountViewMode();
}

const pinMockDatabase = {
    'Poblacion': { title: 'Poblacion Area', species: 'Cat', name: 'Luna', breed: 'Siamese Mix Cat', log: 'Last seen wandering outside the Market Plaza compound.', x: '20%', y: '15%' },
    'SanMiguel': { title: 'Barangay San Miguel', species: 'Dog', name: 'Buddy', breed: 'Golden Retriever Dog', log: 'Spotted running near the Brgy. Hall open athletic field.', x: '55%', y: '15%' },
    'SanJuan': { title: 'Barangay San Juan', species: 'Dog', name: 'Max', breed: 'Aspin Dog', log: 'Last seen resting at the local basketball court.', x: '15%', y: '60%' },
    'Bagumbayan': { title: 'Bagumbayan Neighborhood', species: 'Bird', name: 'Coco', breed: 'Cockatiel Bird', log: 'Heard whistling from the top of a large tree at the entrance gate.', x: '60%', y: '85%' },
    'SantaMaria': { title: 'Barangay Santa Maria', species: 'Dog', name: 'Milo', breed: 'Pug Dog', log: 'Seen walking near the corner of a large bakery.', x: '45%', y: '38%' },
    'TanauanPlaza': { title: 'Tanauan City Plaza', species: 'Dog', name: 'Bella', breed: 'Shih Tzu Dog', log: 'Someone saw it beside the benches near the fountain area.', x: '85%', y: '48%' },
    'Pagaspas': { title: 'Barangay Pagaspas', species: 'Cat', name: 'Oliver', breed: 'Persian Cat', log: 'Seen on the side of the local tricycle terminal area.', x: '42%', y: '72%' },
    'Trapiche': { title: 'Barangay Trapiche', species: 'Dog', name: 'Rocky', breed: 'German Shepherd Dog', log: 'Noticed running near the highway bypass entry point.', x: '22%', y: '90%' }
};

function selectMapPin(locationKey) {
    const buttons = document.querySelectorAll('.map-grid-button');
    buttons.forEach(btn => btn.classList.remove('active-pin'));

    const activeBtn = document.getElementById('pin-' + locationKey);
    if (activeBtn) activeBtn.classList.add('active-pin');

    const marker = document.getElementById('liveRadarMarker');
    const belowContainer = document.getElementById('belowMapDetailsContainer');

    // If the key belongs to a live incident pin (created from Report a Lost Pet),
    // show its exact info on the map panel.
    const incidentPin = (typeof mapPinIncidents === 'object' && mapPinIncidents
        && mapPinIncidents[locationKey]) ? mapPinIncidents[locationKey] : null;
    const data = incidentPin || pinMockDatabase[locationKey];

    if (data && marker && data.x && data.y) {
        marker.style.left = data.x;
        marker.style.top = data.y;
        marker.style.transform = 'translate(-50%, -50%) scale(1)';
    }

    // Sync camera if supported (Google preferred, fallback to OSM)
    if (incidentPin && typeof window.focusGoogleMapPin === 'function') {
        window.focusGoogleMapPin(locationKey);
    } else if (typeof window.focusGoogleMapPin === 'function') {
        // barangay pins
        window.focusGoogleMapPin(locationKey);
    } else if (typeof window.focusOSMPin === 'function' && typeof window.mapPinIncidents === 'object') {
        window.focusOSMPin(locationKey);
    }

    if (data && marker && belowContainer) {
        // Live incident pins store fields like: title/emoji/name/breed/log.
        // Barangay mock pins store similar fields too.
        const titleEl = document.getElementById('belowMapTitle');
        const emojiEl = document.getElementById('belowMapPetEmoji');
        const nameEl = document.getElementById('belowMapPetName');
        const breedEl = document.getElementById('belowMapPetBreed');
        const logEl = document.getElementById('belowMapLog');

        if (titleEl) titleEl.textContent = data.title || '';
        if (emojiEl) emojiEl.textContent = getSpeciesMarkerLabel(data.species || data.breed || data.name);
        if (nameEl) nameEl.textContent = data.name || '';
        if (breedEl) breedEl.textContent = data.breed || '';
        if (logEl) logEl.textContent = data.log || data.summary || '';

        belowContainer.style.display = 'block';
    }
}

function resetMapCanvas() {
    const buttons = document.querySelectorAll('.map-grid-button');
    buttons.forEach(btn => btn.classList.remove('active-pin'));
    const marker = document.getElementById('liveRadarMarker');
    if (marker) marker.style.transform = 'translate(-50%, -50%) scale(0)';
    const belowContainer = document.getElementById('belowMapDetailsContainer');
    if (belowContainer) belowContainer.style.display = 'none';
}

function focusMapLocation(locationKey) {
    showSection('map-page');
    setTimeout(() => { selectMapPin(locationKey); }, 150);
}

function resolveSectionId(sectionId) {
    if (document.getElementById(sectionId)) return sectionId;

    if (sectionId === 'landing-page' && document.getElementById('main-page')) {
        return 'main-page';
    }

    if (sectionId === 'guest-dashboard' && document.getElementById('main-page')) {
        return 'main-page';
    }

    return sectionId;
}

function showSection(sectionId) {
    sectionId = resolveSectionId(sectionId);

    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;

    const sections = document.querySelectorAll('.page-section');
    sections.forEach(sec => sec.classList.remove('active-section'));
    targetSection.classList.add('active-section');

    const navLinks = {
        'main-page': 'nav-home',
        'report-page': 'nav-report',
        'map-page': 'nav-map',
        'about-page': 'nav-about',
        'faqs-page': 'nav-faqs'
    };

    Object.values(navLinks).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });

    const authBtn = document.getElementById('nav-auth-btn');
    if (authBtn) {
        authBtn.classList.remove('btn-sage');
        authBtn.classList.add('btn-outline-sage');

        if (navLinks[sectionId]) {
            const navEl = document.getElementById(navLinks[sectionId]);
            if (navEl) navEl.classList.add('active');
        } else if (sectionId === 'auth-page') {
            authBtn.classList.remove('btn-outline-sage');
            authBtn.classList.add('btn-sage');
        }
    } else if (navLinks[sectionId]) {
        const navEl = document.getElementById(navLinks[sectionId]);
        if (navEl) navEl.classList.add('active');
    }

    window.scrollTo(0, 0);

    if (typeof enforceInfoPageNavbar === 'function') {
        enforceInfoPageNavbar(sectionId);
    }
}

function getHashSectionId() {
    const hashSection = window.location.hash.replace('#', '');
    if (hashSection && document.getElementById(hashSection)) return hashSection;
    return null;
}

function isInfoSection(sectionId) {
    return ['about-page', 'faqs-page', 'terms-page', 'privacy-page'].indexOf(sectionId) !== -1;
}

function goBackFromInfoPage() {
    if (document.getElementById('main-page')) {
        showSection('main-page');
        return;
    }
    window.location.href = 'landing.html';
}

function showAppSection(sectionId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    showSection(sectionId);
    if (document.getElementById('main-page') && window.history && window.history.replaceState) {
        const page = window.location.pathname.split('/').pop() || 'index.html';
        window.history.replaceState(null, '', page + '#' + sectionId);
    }
    return false;
}

function isAppSection(sectionId) {
    return ['main-page', 'report-page', 'map-page', 'about-page', 'faqs-page', 'terms-page', 'privacy-page', 'my-account-page'].indexOf(sectionId) !== -1;
}

function initLoggedInHomepage() {
    if (!document.getElementById('main-page') || !isUserSessionLoggedIn()) return;

    const hashSection = getHashSectionId();
    if (hashSection && isAppSection(hashSection)) {
        showSection(hashSection);
        if (hashSection === 'main-page') {
            const user = getCurrentUser();
            if (user) {
                displayAuthenticatedUser(user.name, user.email, user.location || '', user.contact || '');
            }
        }
        return;
    }

    const user = getCurrentUser();
    if (user) {
        displayAuthenticatedUser(user.name, user.email, user.location || '', user.contact || '');
    }

    showSection('main-page');

    if (typeof enforceNavbarLogoutVisibility === 'function') {
        enforceNavbarLogoutVisibility('main-page');
    }
    if (typeof syncHomepageUserAccountUI === 'function') {
        syncHomepageUserAccountUI('main-page');
    }
}

function initDefaultPageSection() {
    const hashSection = getHashSectionId();
    if (hashSection) {
        showSection(hashSection);
        return;
    }

    if (isUserSessionLoggedIn()) {
        initLoggedInHomepage();
        return;
    }

    if (document.getElementById('landing-page')) {
        showSection('landing-page');
        return;
    }

    if (document.getElementById('main-page')) {
        showSection('main-page');
    }
}

window.onload = function () {
    initDefaultPageSection();
};

let userAccounts = JSON.parse(localStorage.getItem('petfinderUsers')) || [];

function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function displayUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (userAccounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No users added yet.</td></tr>';
        return;
    }

    tbody.innerHTML = userAccounts.map(user => `
        <tr>
            <td class="fw-semibold">${user.name}</td>
            <td><small>${user.email}</small></td>
            <td><span class="badge" style="background-color: var(--primary-sage); color: white;">${user.role}</span></td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-sage" onclick="openEditModal('${user.id}')">Edit</button>
                <button class="btn btn-sm btn-outline-danger" onclick="handleDeleteUser('${user.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function handleAddUser(event) {
    event.preventDefault();

    const name = document.getElementById('newUserName')?.value.trim();
    const email = document.getElementById('newUserEmail')?.value.trim();
    const role = document.getElementById('newUserRole')?.value;

    if (!name || !email || !role) {
        return;
    }

    const newUser = {
        id: generateUserId(),
        name: name,
        email: email,
        role: role,
        createdAt: new Date().toISOString()
    };

    userAccounts.push(newUser);
    localStorage.setItem('petfinderUsers', JSON.stringify(userAccounts));
    appendRegisteredClientRecord(newUser, role);
    displayUsers();

    document.getElementById('addUserForm').reset();
}

function openEditModal(userId) {
    const user = userAccounts.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserName').value = user.name;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserRole').value = user.role;

    document.getElementById('editUserModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editUserModal').style.display = 'none';
}

function handleUpdateUser(event) {
    event.preventDefault();

    const userId = document.getElementById('editUserId').value;
    const name = document.getElementById('editUserName').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    const role = document.getElementById('editUserRole').value;

    const userIndex = userAccounts.findIndex(u => u.id === userId);
    if (userIndex === -1) return;

    userAccounts[userIndex] = {
        ...userAccounts[userIndex],
        name: name,
        email: email,
        role: role
    };

    localStorage.setItem('petfinderUsers', JSON.stringify(userAccounts));
    displayUsers();
    closeEditModal();
}

function handleDeleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        userAccounts = userAccounts.filter(u => u.id !== userId);
        localStorage.setItem('petfinderUsers', JSON.stringify(userAccounts));
        displayUsers();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    displayUsers();
    bindNavAccountDropdown();
});

let lostPetReports = [];
let activePetReportId = null;

const DEFAULT_LOST_PET_REPORTS = [
    { id: 'report_buddy', name: 'Buddy', species: 'Dog', breed: 'Golden Retriever', location: 'Barangay San Miguel', dateLost: 'Oct 20, 2023', dateLostISO: '2023-10-20', mapKey: 'SanMiguel' },
    { id: 'report_luna', name: 'Luna', species: 'Cat', breed: 'Siamese Mix', location: 'Poblacion Area', dateLost: 'May 12, 2026', dateLostISO: '2026-05-12', mapKey: 'Poblacion' },
    { id: 'report_max', name: 'Max', species: 'Dog', breed: 'Aspin', location: 'Barangay San Juan', dateLost: 'Apr 28, 2026', dateLostISO: '2026-04-28', mapKey: 'SanJuan' },
    { id: 'report_coco', name: 'Coco', species: 'Bird', breed: 'Cockatiel', location: 'Bagumbayan', dateLost: 'May 30, 2026', dateLostISO: '2026-05-30', mapKey: 'Bagumbayan' }
];

function cloneDefaultLostPetReports() {
    return DEFAULT_LOST_PET_REPORTS.map(function (r) {
        return {
            id: r.id,
            name: r.name,
            species: r.species,
            breed: r.breed,
            location: r.location,
            dateLost: r.dateLost,
            dateLostISO: r.dateLostISO,
            mapKey: r.mapKey || guessMapKeyFromLocation(r.location),
            emoji: getSpeciesEmojiForReport(r.species),
            photo: '',
            details: '',
            ownerEmail: '',
            ownerName: '',
            returned: false,
            returnedAt: ''
        };
    });
}

function normalizeReportRecord(report) {
    if (!report) return report;
    const found = report.status === 'Found'
        || report.returned === true
        || report.returned === 1
        || report.returned === '1';
    return {
        ...report,
        status: found ? 'Found' : 'Lost',
        returned: found
    };
}

function mergeWithDefaultLostPetReports(reports) {
    const fromApi = (Array.isArray(reports) ? reports : []).map(normalizeReportRecord);
    if (fromApi.length > 0) {
        return fromApi;
    }
    return cloneDefaultLostPetReports();
}

function reportsFromApiOnly(reports) {
    return (Array.isArray(reports) ? reports : []).map(normalizeReportRecord);
}

const PETFINDER_REPORTS_REVISION_KEY = 'petfinderReportsRevision';

function bumpReportsRevision() {
    try {
        localStorage.setItem(PETFINDER_REPORTS_REVISION_KEY, String(Date.now()));
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('petfinder-reports-changed'));
}

function bindReportsRevisionSync() {
    if (window.__petfinderReportsRevisionBound) return;
    window.__petfinderReportsRevisionBound = true;

    const syncFromDatabase = function () {
        if (!document.getElementById('lostPetReportsContainer')) return;
        if (typeof refreshLostPetReportsFromBackend === 'function') {
            refreshLostPetReportsFromBackend();
        }
    };

    window.addEventListener('storage', function (event) {
        if (event.key !== PETFINDER_REPORTS_REVISION_KEY) return;
        syncFromDatabase();
    });
    window.addEventListener('petfinder-reports-changed', syncFromDatabase);
    window.addEventListener('pageshow', syncFromDatabase);
}

function applyLostPetReportsRefresh(done) {
    if (!(typeof usePetFinderBackend === 'function' && usePetFinderBackend())) {
        saveLostPetReports();
    }
    pruneOwnerNotificationsForDeletedReports();
    syncAllLostPetReportsToMap();
    if (document.getElementById('lostPetReportsContainer')) {
        renderLostPetReports();
    }
    if (typeof renderMapPinList === 'function') {
        renderMapPinList();
    }
    if (typeof refreshGoogleMapMarkers === 'function') {
        refreshGoogleMapMarkers();
    }
    if (typeof renderOwnerNotificationsPanel === 'function') {
        renderOwnerNotificationsPanel();
    }
    if (typeof done === 'function') done(true);
}

function refreshLostPetReportsFromBackend(done) {
    if (!window.PetFinderAPI) {
        if (typeof done === 'function') done(false);
        return Promise.resolve(false);
    }

    return PetFinderAPI.init().then(function (ok) {
        if (!ok) {
            if (typeof done === 'function') done(false);
            return false;
        }

        return PetFinderAPI.getReports().then(function (res) {
            lostPetReports = reportsFromApiOnly(res.reports || []);
            try {
                localStorage.removeItem('petfinderLostPets');
            } catch (e) {}
            applyLostPetReportsRefresh(done);
            return true;
        }).catch(function () {
            if (typeof done === 'function') done(false);
            return false;
        });
    }).catch(function () {
        if (typeof done === 'function') done(false);
        return false;
    });
}

function generatePetReportId() {
    return 'report_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

function getSpeciesEmojiForReport(species) {
    return getSpeciesMarkerLabel(species);
}

function formatReportDate(dateInput) {
    if (!dateInput) return '--';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return new Date(dateInput + 'T00:00:00').toLocaleDateString('en-US', options);
    }
    return dateInput;
}

function parseDisplayDateToISO(displayDate) {
    if (!displayDate) return '';
    const parsed = new Date(displayDate);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }
    return '';
}

function getBarangayCoordsForMapKey(locationKey) {
    if (!locationKey || typeof window.TANAUAN_BARANGAYS === 'undefined') return null;
    const aliases = window.TANAUAN_PIN_ALIASES || {};
    const resolved = aliases[locationKey] || locationKey;
    const barangay = window.TANAUAN_BARANGAYS[resolved];
    return barangay ? { lat: barangay.lat, lng: barangay.lng, name: barangay.name } : null;
}

function guessMapKeyFromLocation(location) {
    const loc = (location || '').toLowerCase();
    if (typeof window.TANAUAN_BARANGAYS === 'object') {
        const aliases = window.TANAUAN_PIN_ALIASES || {};
        const keys = Object.keys(window.TANAUAN_BARANGAYS);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const name = window.TANAUAN_BARANGAYS[key].name.toLowerCase();
            if (loc.includes(name) || loc.includes(name.replace('barangay ', ''))) {
                return key;
            }
        }
        const aliasKeys = Object.keys(aliases);
        for (let j = 0; j < aliasKeys.length; j++) {
            const alias = aliasKeys[j];
            if (loc.includes(alias.toLowerCase().replace(/([A-Z])/g, ' $1').trim())) {
                return alias;
            }
        }
    }
    if (loc.includes('san miguel')) return 'SanMiguel';
    if (loc.includes('poblacion')) return 'Poblacion';
    if (loc.includes('san juan')) return 'SanJuan';
    if (loc.includes('bagumbayan')) return 'Bagumbayan';
    if (loc.includes('santa maria')) return 'SantaMaria';
    if (loc.includes('plaza')) return 'TanauanPlaza';
    if (loc.includes('pagaspas')) return 'Pagaspas';
    if (loc.includes('trapiche')) return 'Trapiche';
    return 'Poblacion';
}

function saveLostPetReports() {
    localStorage.setItem('petfinderLostPets', JSON.stringify(lostPetReports));
}

function isPetFound(report) {
    if (!report) return false;
    if (report.status === 'Found') return true;
    if (report.status === 'Lost') return false;
    return !!report.returned;
}

function getPetStatusLabel(report) {
    if (!report) return 'Lost';
    if (report.status === 'Found' || report.status === 'Lost') return report.status;
    return isPetFound(report) ? 'Found' : 'Lost';
}

function getPetStatusBadgeHtml(report) {
    if (isPetFound(report)) {
        return '<span class="badge bg-success">Found</span>';
    }
    return '<span class="badge bg-danger">Lost</span>';
}

function patchLocalReportStatus(reportId, found) {
    const foundBool = !!found;
    let previousReport = null;

    lostPetReports = lostPetReports.map(function (r) {
        if (r.id !== reportId) return r;
        previousReport = r;
        return {
            ...r,
            status: foundBool ? 'Found' : 'Lost',
            returned: foundBool,
            returnedAt: foundBool ? new Date().toISOString() : ''
        };
    });

    saveLostPetReports();
    syncAllLostPetReportsToMap();

    if (foundBool && previousReport && previousReport.ownerEmail && !previousReport.returned) {
        addOwnerPetNotification(previousReport.ownerEmail, {
            type: 'returned',
            reportId: previousReport.id,
            petName: previousReport.name,
            message: 'Your lost pet (' + previousReport.name + ') has been marked as Found. An admin updated the status in your records.'
        });
    }

    if (document.getElementById('lostPetReportsContainer')) {
        renderLostPetReports();
    }

    return lostPetReports.find(function (r) { return r.id === reportId; }) || null;
}

function adminUpdatePetReportStatus(reportId, found) {
    if (typeof isCurrentUserAdmin === 'function' && !isCurrentUserAdmin()) {
        return Promise.reject(new Error('Admin access required.'));
    }

    if (!window.PetFinderAPI) {
        return Promise.reject(new Error('Database API is not available. Open the site through XAMPP (http://localhost/petfinder/).'));
    }

    const previousReport = lostPetReports.find(function (r) { return r.id === reportId; })
        || (typeof adminReportsCache !== 'undefined' ? adminReportsCache.find(function (r) { return r.id === reportId; }) : null);

    const applyUpdate = function (updatedReport) {
        if (!updatedReport) {
            return Promise.reject(new Error('Database did not return the updated report.'));
        }

        const normalized = normalizeReportRecord(updatedReport);
        const hadReport = lostPetReports.some(function (r) { return r.id === reportId; });
        if (hadReport) {
            lostPetReports = lostPetReports.map(function (r) {
                return r.id === reportId ? { ...r, ...normalized } : r;
            });
        } else {
            lostPetReports.unshift(normalized);
        }

        if (!(typeof usePetFinderBackend === 'function' && usePetFinderBackend())) {
            saveLostPetReports();
        }
        syncAllLostPetReportsToMap();

        if (found && previousReport && !isPetFound(previousReport) && normalized.ownerEmail) {
            addOwnerPetNotification(normalized.ownerEmail, {
                type: 'returned',
                reportId: normalized.id,
                petName: normalized.name,
                message: 'Your lost pet (' + normalized.name + ') has been marked as Found. An admin updated the status in your records.'
            });
        }

        if (document.getElementById('lostPetReportsContainer')) {
            renderLostPetReports();
        }

        bumpReportsRevision();

        return normalized;
    };

    return PetFinderAPI.init().then(function (ok) {
        if (!ok) {
            return Promise.reject(new Error('Database not connected. Start Apache and MySQL in XAMPP, then refresh this page.'));
        }

        return PetFinderAPI.updateAdminReportStatus(reportId, found).then(function (res) {
            return applyUpdate(res.report || null);
        });
    });
}

let homepageSearchFilters = null;

function getHomepageSearchFilterValues() {
    return {
        keywords: (document.getElementById('homepageSearchKeywords')?.value || '').trim().toLowerCase(),
        species: document.getElementById('speciesSelect')?.value || '',
        breed: (document.getElementById('breedSelect')?.value || '').trim().toLowerCase(),
        date: document.getElementById('homepageSearchDate')?.value || ''
    };
}

function reportMatchesHomepageSearch(report, filters) {
    if (!filters) return true;

    if (filters.species) {
        if (filters.species === 'Others') {
            if (report.species === 'Dog' || report.species === 'Cat') return false;
        } else if (String(report.species || '').toLowerCase() !== filters.species.toLowerCase()) {
            return false;
        }
    }

    if (filters.breed && !String(report.breed || '').toLowerCase().includes(filters.breed)) {
        return false;
    }

    if (filters.date) {
        const reportDate = report.dateLostISO || parseDisplayDateToISO(report.dateLost);
        if (reportDate !== filters.date) return false;
    }

    if (filters.keywords) {
        const haystack = [
            report.name,
            report.species,
            report.breed,
            report.location,
            report.details,
            report.ownerName
        ].join(' ').toLowerCase();

        if (!haystack.includes(filters.keywords)) return false;
    }

    return true;
}

function handleHomepagePetSearch() {
    const filters = getHomepageSearchFilterValues();
    const hasFilter = !!(filters.keywords || filters.species || filters.breed || filters.date);
    homepageSearchFilters = hasFilter ? filters : null;
    renderLostPetReports();
}

function clearHomepageSearch() {
    homepageSearchFilters = null;

    const keywords = document.getElementById('homepageSearchKeywords');
    const species = document.getElementById('speciesSelect');
    const breed = document.getElementById('breedSelect');
    const date = document.getElementById('homepageSearchDate');

    if (keywords) keywords.value = '';
    if (species) species.value = '';
    if (breed) breed.value = '';
    if (date) date.value = '';

    if (species && breed) {
        filterBreeds('speciesSelect', 'breedSelect');
    }

    renderLostPetReports();
}

function bindHomepageSearchForm() {
    const btn = document.getElementById('homepageSearchBtn');
    const clearBtn = document.getElementById('homepageClearSearchBtn');
    const form = document.querySelector('#main-page .custom-card form');

    if (btn && btn.dataset.searchBound !== 'true') {
        btn.addEventListener('click', handleHomepagePetSearch);
        btn.dataset.searchBound = 'true';
    }

    if (clearBtn && clearBtn.dataset.searchBound !== 'true') {
        clearBtn.addEventListener('click', clearHomepageSearch);
        clearBtn.dataset.searchBound = 'true';
    }

    if (form && form.dataset.searchBound !== 'true') {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            handleHomepagePetSearch();
        });
        form.dataset.searchBound = 'true';
    }
}

function renderLostPetReports() {
    const container = document.getElementById('lostPetReportsContainer');
    if (!container) return;

    let reports = lostPetReports.slice();
    if (homepageSearchFilters) {
        reports = reports.filter(function (report) {
            return reportMatchesHomepageSearch(report, homepageSearchFilters);
        });
    }

    if (reports.length === 0) {
        container.innerHTML = '<div class="col-12"><p class="text-center text-muted py-4 mb-0">No lost pet reports match your search.</p></div>';
        return;
    }

    container.innerHTML = reports.map(function (report) {
        const statusBadge = getPetStatusBadgeHtml(report);
        const dateLine = '<p class="mb-0 text-secondary small">Date lost: ' + report.dateLost + '</p>';

        const sightingBtn = isPetFound(report)
            ? '<button type="button" class="btn btn-sm btn-outline-secondary fw-bold w-50 py-1.5" style="font-size: 12px;" disabled>Found</button>'
            : '<button type="button" class="btn btn-sm btn-coral fw-bold w-50 py-1.5" style="font-size: 12px;" onclick="submitPetSighting(\'' + report.id + '\')">Sighting</button>';

        return `
      <div class="col" data-report-id="${report.id}">
        <div class="card custom-card h-100 p-3">
          <div class="pet-img-box mb-3">${getReportCardImageHtml(report)}</div>
          <div class="mb-3 small">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
              <h5 class="fw-bold mb-0">${report.name}</h5>
              ${statusBadge}
            </div>
            <p class="mb-1 text-muted"><strong>Species:</strong> ${report.species}</p>
            <p class="mb-2 text-muted"><strong>Breed:</strong> ${report.breed}</p>
            <p class="mb-1"><span class="meta-label">Location</span> <span class="fw-semibold">${report.location}</span></p>
            ${dateLine}
          </div>
          <div class="d-flex gap-2 mt-auto">
            <button type="button" class="btn btn-sm btn-outline-sage fw-bold w-50 py-1.5" style="font-size: 12px;" onclick="openPetDetailsModal('${report.id}')">View Details</button>
            ${sightingBtn}
          </div>
        </div>
      </div>`;
    }).join('');
}

function isCurrentUserReportOwner(report) {
    if (!report || !isUserSessionLoggedIn()) return false;

    const user = getCurrentUser();
    if (!user || !user.email || !report.ownerEmail) return false;

    return String(report.ownerEmail).toLowerCase() === String(user.email).toLowerCase();
}

function populatePetDetailsView(report) {
    const modalPetEmoji = document.getElementById('modalPetEmoji');
    if (modalPetEmoji) {
        if (report.photo) {
            modalPetEmoji.className = 'user-avatar-large mx-auto mb-2';
            modalPetEmoji.innerHTML = '<img src="' + report.photo + '" alt="' + (report.name || 'Lost pet') + '" class="pet-report-photo-modal">';
        } else {
            modalPetEmoji.className = 'user-avatar-large mx-auto mb-2 pet-species-fallback';
            modalPetEmoji.textContent = getSpeciesBadgeText(report.species);
        }
    }
    document.getElementById('modalPetName').textContent = report.name;
    document.getElementById('modalPetSpecies').textContent = report.species;
    document.getElementById('modalPetBreed').textContent = report.breed;
    document.getElementById('modalPetLocation').textContent = report.location;
    document.getElementById('modalPetDate').textContent = report.dateLost;
    document.getElementById('editPetId').value = report.id;

    const detailsEl = document.getElementById('modalPetDetails');
    if (detailsEl) {
        detailsEl.textContent = report.details ? report.details : '—';
    }

    const statusBadge = document.getElementById('modalPetStatusBadge');
    if (statusBadge) {
        statusBadge.className = 'badge ' + (isPetFound(report) ? 'bg-success' : 'bg-danger');
        statusBadge.textContent = getPetStatusLabel(report);
    }

    const returnedBadge = document.getElementById('modalPetReturnedBadge');
    if (returnedBadge) {
        returnedBadge.style.display = 'none';
    }

    const returnedBtn = document.getElementById('markReturnedBtn');
    if (returnedBtn) {
        returnedBtn.style.display = 'none';
    }

    const ownerActions = document.getElementById('petDetailsOwnerActions');
    if (ownerActions) {
        ownerActions.style.display = isCurrentUserReportOwner(report) ? 'flex' : 'none';
    }
}

function openPetDetailsModal(reportId) {
    const report = lostPetReports.find(function (r) { return r.id === reportId; });
    if (!report) return;

    const modal = document.getElementById('petDetailsModal');
    if (!modal) return;

    activePetReportId = reportId;
    populatePetDetailsView(report);
    switchPetToViewMode();
    modal.style.display = 'flex';

    if (document.getElementById('main-page')) {
        showSection('main-page');
    }
}

function closePetDetailsModal() {
    document.getElementById('petDetailsModal').style.display = 'none';
    activePetReportId = null;
    switchPetToViewMode();
}

function switchPetToViewMode() {
    const viewMode = document.getElementById('petViewMode');
    const editMode = document.getElementById('petEditMode');
    if (viewMode) viewMode.style.display = 'block';
    if (editMode) editMode.style.display = 'none';
}

function switchPetToEditMode() {
    const report = lostPetReports.find(function (r) { return r.id === activePetReportId; });
    if (!report || !isCurrentUserReportOwner(report)) return;

    document.getElementById('editPetNameInput').value = report.name;
    document.getElementById('editPetSpeciesSelect').value = report.species;
    filterBreeds('editPetSpeciesSelect', 'editPetBreedSelect');

    const breedSelect = document.getElementById('editPetBreedSelect');
    if (breedSelect) {
        breedSelect.value = report.breed;
        if (!breedSelect.value && report.breed) {
            const customBreed = document.createElement('option');
            customBreed.value = report.breed;
            customBreed.textContent = report.breed;
            breedSelect.appendChild(customBreed);
            breedSelect.value = report.breed;
        }
    }

    document.getElementById('editPetLocationInput').value = report.location;
    document.getElementById('editPetDateInput').value = report.dateLostISO || parseDisplayDateToISO(report.dateLost);

    document.getElementById('petViewMode').style.display = 'none';
    document.getElementById('petEditMode').style.display = 'block';
}

function handleUpdatePetReport(event) {
    event.preventDefault();

    const reportId = activePetReportId || document.getElementById('editPetId').value;
    const reportIndex = lostPetReports.findIndex(function (r) { return r.id === reportId; });
    if (reportIndex === -1) return;

    if (!isCurrentUserReportOwner(lostPetReports[reportIndex])) return;

    const species = document.getElementById('editPetSpeciesSelect').value;
    const location = document.getElementById('editPetLocationInput').value.trim();
    const dateISO = document.getElementById('editPetDateInput').value;

    lostPetReports[reportIndex] = {
        ...lostPetReports[reportIndex],
        name: document.getElementById('editPetNameInput').value.trim(),
        species: species,
        breed: document.getElementById('editPetBreedSelect').value,
        location: location,
        dateLostISO: dateISO,
        dateLost: formatReportDate(dateISO),
        emoji: getSpeciesEmojiForReport(species),
        mapKey: guessMapKeyFromLocation(location)
    };

    saveLostPetReports();
    renderLostPetReports();
    populatePetDetailsView(lostPetReports[reportIndex]);
    switchPetToViewMode();
    syncAllLostPetReportsToMap();
}

function deleteLostPetReportById(reportId) {
    if (!reportId) return false;

    lostPetReports = lostPetReports.filter(function (r) { return r.id !== reportId; });
    saveLostPetReports();
    removeOwnerNotificationsForReport(reportId);
    syncAllLostPetReportsToMap();

    if (document.getElementById('lostPetReportsContainer')) {
        renderLostPetReports();
    }

    if (document.getElementById('map-page') && document.getElementById('map-page').classList.contains('active-section')) {
        resetMapCanvas();
    }

    return true;
}

function adminDeleteLostPetReport(reportId) {
    if (!reportId) return false;
    if (typeof isCurrentUserAdmin === 'function' && !isCurrentUserAdmin()) return false;

    const report = lostPetReports.find(function (r) { return r.id === reportId; });
    if (!report) return false;

    if (usePetFinderBackend()) {
        const deleted = deleteLostPetReportById(reportId);
        if (deleted) {
            PetFinderAPI.deleteAdminReport(reportId).catch(function () {});
        }
        return deleted;
    }

    return deleteLostPetReportById(reportId);
}

function handleDeletePetReport() {
    if (!activePetReportId) return;

    const reportIdToDelete = activePetReportId;

    if (!confirm('Are you sure you want to delete this pet report? This will also remove it from the Community Map.')) {
        return;
    }

    closePetDetailsModal();
    activePetReportId = null;
    deleteLostPetReportById(reportIdToDelete);
}



function createLostPetReport(petName, species, breed, location, dateInput, reportDetails, photoData) {
    const user = getCurrentUser();
    const newReport = {
        id: generatePetReportId(),
        name: petName,
        species: species,
        breed: breed,
        location: location,
        dateLost: formatReportDate(dateInput),
        dateLostISO: dateInput,
        emoji: getSpeciesEmojiForReport(species),
        photo: photoData || '',
        mapKey: guessMapKeyFromLocation(location),
        ownerEmail: user && user.email ? user.email.toLowerCase() : '',
        ownerName: user ? user.name : '',
        details: (reportDetails || '').trim(),
        status: 'Lost',
        returned: false,
        returnedAt: ''
    };

    function finishCreate(report) {
        const savedReport = normalizeReportRecord(report);
        lostPetReports = [savedReport].concat(
            lostPetReports.filter(function (r) { return r.id !== savedReport.id; })
        );
        if (!(typeof usePetFinderBackend === 'function' && usePetFinderBackend())) {
            saveLostPetReports();
        }
        bumpReportsRevision();
        renderLostPetReports();
        notifyOwnerPetPosted(savedReport);
        syncAllLostPetReportsToMap();
        return savedReport;
    }

    if (typeof usePetFinderBackend === 'function' && usePetFinderBackend()) {
        return PetFinderAPI.createReport(newReport).then(function (res) {
            const excelSync = res && res.excelSync;
            if (excelSync && excelSync.success === false) {
                alert('Report saved sa database, pero hindi na-update ang Excel file.\n\n' +
                    (excelSync.message || 'Isara ang Excel file, tapos buksan: /api/pbi/sync.php'));
            } else if (excelSync && excelSync.excelLocked) {
                alert('Report saved. Excel ay nakabukas kaya na-save sa LATEST file.\n\nIsara ang Excel at i-run ang sync sa Analytics page.');
            }
            return finishCreate(res.report || newReport);
        }).catch(function (err) {
            alert((err && err.message) || 'Failed to save your report to the database. Make sure you are logged in and MySQL is running.');
            return Promise.reject(err);
        });
    }

    return Promise.resolve(finishCreate(newReport));
}

function initLostPetReportsCRUD() {
    if (window.__petfinderLostPetReportsInit) return;
    window.__petfinderLostPetReportsInit = true;

    bindReportsRevisionSync();

    function finishInit() {
        renderLostPetReports();
        bindHomepageSearchForm();
    }

    function showReportsLoadError(message) {
        const container = document.getElementById('lostPetReportsContainer');
        if (container) {
            container.innerHTML = '<div class="col-12"><p class="text-center text-danger py-4 mb-0">' +
                (message || 'Could not load pet reports from the database.') + '</p></div>';
        }
    }

    function loadOfflineDefaults() {
        lostPetReports = cloneDefaultLostPetReports();
        syncAllLostPetReportsToMap();
        saveLostPetReports();
        finishInit();
    }

    function afterReportsLoaded() {
        pruneOwnerNotificationsForDeletedReports();
        finishInit();
        if (typeof renderOwnerNotificationsPanel === 'function') {
            renderOwnerNotificationsPanel();
        }
    }

    function loadReportsWithRetry(attempt) {
        refreshLostPetReportsFromBackend(function (loaded) {
            if (loaded) {
                afterReportsLoaded();
                return;
            }

            if (attempt < 4) {
                setTimeout(function () {
                    loadReportsWithRetry(attempt + 1);
                }, 1000);
                return;
            }

            whenBackendReady(function (ok) {
                if (!ok) {
                    loadOfflineDefaults();
                    return;
                }
                showReportsLoadError('Could not load reports from the database. Check that Apache and MySQL are running in XAMPP.');
            });
        });
    }

    loadReportsWithRetry(0);

    if (!window.__petfinderHomeRefreshInterval) {
        window.__petfinderHomeRefreshInterval = setInterval(function () {
            if (!document.getElementById('lostPetReportsContainer')) return;
            if (typeof refreshLostPetReportsFromBackend === 'function') {
                refreshLostPetReportsFromBackend();
            }
        }, 3000);
    }
}

function bindLostPetReportFormHandler() {
    const form = document.getElementById('lostPetForm');
    if (!form || form.dataset.petfinderSubmitBound === 'true') return;

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        submitLostPetReport(event);
    }, true);

    form.removeAttribute('onsubmit');
    form.dataset.petfinderSubmitBound = 'true';
}

function ensureUserWelcomeBanner() {
    const mainPage = document.getElementById('main-page');
    if (!mainPage) return null;

    let banner = document.getElementById('user-welcome-banner');
    if (!banner) {
        banner = document.createElement('section');
        banner.id = 'user-welcome-banner';
        banner.className = 'custom-card p-3 my-3';
        banner.style.display = 'none';
        banner.innerHTML = `
          <h3 class="fw-bold mb-1" id="user-welcome-text">Welcome back!</h3>
          <p class="mb-0 text-muted small" id="user-welcome-email">Signed in</p>`;
        mainPage.insertBefore(banner, mainPage.firstChild);
    }

    positionUserBannerAboveHero();
    return banner;
}

function fixInfoPageHeroBackButtons() {
    ['about-page', 'faqs-page', 'terms-page', 'privacy-page'].forEach(function (pageId) {
        const page = document.getElementById(pageId);
        if (!page) return;

        const header = page.querySelector('header.hero-banner');
        if (!header) return;

        header.classList.add('hero-banner-with-back', 'position-relative');

        let backBtn = header.querySelector('.hero-back-btn');
        if (!backBtn) {
            backBtn = document.createElement('button');
            backBtn.type = 'button';
            backBtn.className = 'hero-back-btn';
            backBtn.setAttribute('aria-label', 'Back');
            backBtn.title = 'Back';
            backBtn.textContent = '←';
            backBtn.addEventListener('click', goBackFromInfoPage);
            header.insertBefore(backBtn, header.firstChild);
        }
    });
}

function fixMyAccountHeroBackButton() {
    const page = document.getElementById('my-account-page');
    if (!page) return;

    page.querySelectorAll(':scope > .account-back-btn').forEach(function (btn) {
        btn.remove();
    });

    const header = page.querySelector('header.hero-banner');
    if (!header) return;

    header.classList.add('hero-banner-with-back', 'position-relative');

    let backBtn = header.querySelector('.hero-back-btn');
    if (!backBtn) {
        const looseBtn = page.querySelector('.account-back-btn');
        if (looseBtn) {
            looseBtn.classList.remove('account-back-btn');
            looseBtn.classList.add('hero-back-btn');
            header.insertBefore(looseBtn, header.firstChild);
            backBtn = looseBtn;
        } else {
            backBtn = document.createElement('button');
            backBtn.type = 'button';
            backBtn.className = 'hero-back-btn';
            backBtn.setAttribute('aria-label', 'Back to Home');
            backBtn.title = 'Back to Home';
            backBtn.textContent = '←';
            backBtn.addEventListener('click', function () {
                showSection('main-page');
            });
            header.insertBefore(backBtn, header.firstChild);
        }
    }

    if (backBtn && !backBtn.getAttribute('aria-label')) {
        backBtn.setAttribute('aria-label', 'Back to Home');
        backBtn.title = 'Back to Home';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('landing-page') && !document.getElementById('main-page')) {
        return;
    }

    if (isStandaloneAppPage()) {
        initPetFinderBackend(function () {
            initOwnerPetNotifications();
        });
        setTimeout(function () {
            initStandalonePageNav();
        }, 50);
        return;
    }

    initLostPetReportsCRUD();
    initRegisterThenLoginFlow();

    initPetFinderBackend(function () {
        initPasswordToggleButtons();
        if (!usePetFinderBackend()) {
            ensureDefaultAdminAccount();
        }
        initAdminAuthPage();
        hideGuestDashboardPreviewOnLanding();
        initOwnerPetNotifications();
        bindLostPetReportFormHandler();
        bindDistinctDetailsWarning();
        ensureUserWelcomeBanner();
        fixInfoPageHeroBackButtons();
        fixMyAccountHeroBackButton();
        if (document.getElementById('speciesSelect') && document.getElementById('breedSelect')) {
            filterBreeds('speciesSelect', 'breedSelect');
        }
    });

    window.addEventListener('hashchange', function () {
        const hashSection = getHashSectionId();
        if (hashSection) showSection(hashSection);
    });

    const initialHashSection = getHashSectionId();
    if (initialHashSection && isInfoSection(initialHashSection)) {
        enforceInfoPageNavbar(initialHashSection);
    }

    setTimeout(function () {
        initHideLandingNavLoginRegister();
        initNavbarLogoutVisibility();
        initLandingPageAuthExperience();
        demoteRegisteredOnlySession();
        restoreAccountManagementToAccountPage();
        const hashSection = getHashSectionId();
        if (hashSection && isAppSection(hashSection) && document.getElementById('main-page')) {
            showSection(hashSection);
            if (isUserSessionLoggedIn()) {
                const user = getCurrentUser();
                if (user && hashSection === 'main-page') {
                    displayAuthenticatedUser(user.name, user.email, user.location || '', user.contact || '');
                }
            }
        } else if (!hashSection || hashSection === 'main-page') {
            initLoggedInHomepage();
        }
        enforceNavbarLogoutVisibility(getActiveSectionId());
        ensureUserWelcomeBanner();
        fixInfoPageHeroBackButtons();
        fixMyAccountHeroBackButton();
        renderOwnerNotificationsPanel();
    }, 50);
});


function isUserSessionLoggedIn() {
    return sessionStorage.getItem('petfinderLoggedIn') === 'true' && !!getCurrentUser();
}

function isStandaloneAppPage() {
    return !document.getElementById('main-page')
        && !document.getElementById('landing-page')
        && !!document.getElementById('nav-auth-btn');
}

function initStandalonePageNav() {
    createNavActionButtons();
    ensureOwnerNotificationsPanel();
    bindNavAccountDropdown();
    bindNavNotificationBell();
    hideDuplicateCombinedNavAuthButton('main-page');
    enforceNavbarLogoutVisibility('main-page');

    if (isUserSessionLoggedIn()) {
        const user = getCurrentUser();
        if (user) {
            displayMyAccountProfile();
        }
        renderOwnerNotificationsPanel();
    }
}

function getActiveSectionId() {
    const mainPage = document.getElementById('main-page');
    if (mainPage && mainPage.classList.contains('active-section')) {
        return 'main-page';
    }
    const activeSection = document.querySelector('.page-section.active-section');
    if (activeSection) return activeSection.id;

    return document.getElementById('main-page') ? 'main-page' : 'landing-page';
}

function shouldShowNavbarLogout(sectionId) {
    const guestOnlySections = ['landing-page', 'auth-page'];
    return isUserSessionLoggedIn() && guestOnlySections.indexOf(sectionId) === -1;
}

function shouldShowNavUserAccount(sectionId) {
    const guestOnlySections = ['landing-page', 'auth-page'];
    return isUserSessionLoggedIn() && guestOnlySections.indexOf(sectionId) === -1;
}

function ensureLogoutButtonBesideUserAccount() {
    const navAccount = document.getElementById('nav-account');
    const navAuth = document.getElementById('nav-auth-btn');
    const navNotif = document.getElementById('nav-notifications');
    const container = navAccount ? navAccount.parentElement : null;
    if (!container || !navAuth || !navAccount) return;
    if (navNotif) container.insertBefore(navNotif, navAccount);
    container.insertBefore(navAuth, navAccount);
}

function updateNavbarUserAccount(sectionId) {
    const navAccount = document.getElementById('nav-account');
    const navUserBtn = document.getElementById('navUserBtn');
    if (!navAccount || !navUserBtn) return;

    if (shouldShowNavUserAccount(sectionId)) {
        const user = getCurrentUser();
        const initialsEl = document.getElementById('nav-user-initials');

        if (initialsEl && user) {
            initialsEl.textContent = (user.name || 'U').split(' ').map(function (s) {
                return s[0];
            }).join('').slice(0, 2).toUpperCase();
        }

        navUserBtn.title = (user.name || 'My Account') + (user.email ? ' — ' + user.email : '');
        navAccount.classList.remove('nav-user-logout-hidden', 'd-none');
        navAccount.classList.add('d-flex', 'nav-user-visible');
        displayMyAccountProfile();
        bindNavAccountDropdown();

        const navNotif = document.getElementById('nav-notifications');
        if (navNotif) {
            navNotif.classList.remove('d-none');
            navNotif.classList.add('d-flex');
        }

        if (typeof renderOwnerNotificationsPanel === 'function') {
            renderOwnerNotificationsPanel();
        }
    } else {
        navAccount.classList.remove('d-flex', 'nav-user-visible');
        navAccount.classList.add('nav-user-logout-hidden', 'd-none');
        closeNavAccountDropdown();

        const navNotif = document.getElementById('nav-notifications');
        if (navNotif) {
            navNotif.classList.add('d-none');
            navNotif.classList.remove('d-flex');
            closeNavNotificationDropdown();
        }
    }
}

function enforceInfoPageNavbar(sectionId) {
    const isInfo = isInfoSection(sectionId);
    document.body.classList.toggle('on-info-page', !!isInfo);
}

function enforceNavbarLogoutVisibility(sectionId) {
    sectionId = sectionId || getActiveSectionId();
    enforceInfoPageNavbar(sectionId);
    const showUserAccount = isUserSessionLoggedIn() && shouldShowNavUserAccount(sectionId);
    const navAuth = document.getElementById('nav-auth-btn');
    const loginBtn = document.getElementById('nav-login-btn');
    const registerBtn = document.getElementById('nav-register-btn');

    if (navAuth) {
        const label = navAuth.textContent.replace(/\s+/g, ' ').trim();
        const isLogoutButton = /^logout$/i.test(label);

        if (showUserAccount) {
            navAuth.classList.remove('nav-logout-hidden', 'auth-hidden', 'nav-combined-auth-hidden');
            navAuth.classList.add('nav-logout-visible', 'btn-sage');
            navAuth.classList.remove('btn-outline-sage');
            navAuth.textContent = 'Logout';
            navAuth.onclick = logoutUser;
            ensureLogoutButtonBesideUserAccount();
        } else if (isLogoutButton) {
            navAuth.classList.remove('nav-logout-visible');
            navAuth.classList.add('nav-logout-hidden');
            if (!isUserSessionLoggedIn()) {
                navAuth.classList.add('auth-hidden');
            }
        } else {
            navAuth.classList.remove('nav-logout-visible', 'nav-logout-hidden');
        }
    }

    updateNavbarUserAccount(sectionId);

    if (loginBtn && registerBtn) {
        if (showUserAccount) {
            loginBtn.classList.add('auth-hidden', 'nav-login-register-hidden');
            registerBtn.classList.add('auth-hidden', 'nav-login-register-hidden');
        } else {
            loginBtn.classList.remove('auth-hidden', 'nav-login-register-hidden');
            registerBtn.classList.remove('auth-hidden', 'nav-login-register-hidden');
        }
    }

    if (sectionId === 'main-page' && isUserSessionLoggedIn()) {
        const guestDashboard = document.getElementById('guest-dashboard');
        if (guestDashboard) guestDashboard.classList.remove('active-section');
    }

    hideLandingNavLoginRegisterOnSection(sectionId);
    syncHomepageUserAccountUI(sectionId);
}

function restoreAccountManagementToAccountPage() {
    const accountPage = document.getElementById('account-page');
    const mount = document.getElementById('homepage-user-account-mount');
    if (!accountPage) return;

    if (mount) {
        const mainInMount = mount.querySelector('main');
        if (mainInMount && !accountPage.contains(mainInMount)) {
            accountPage.appendChild(mainInMount);
        }
        mount.style.display = 'none';
        mount.classList.add('homepage-account-hidden');
    }

    const accountPageMain = accountPage.querySelector('main');
    if (accountPageMain) {
        accountPageMain.classList.remove('homepage-account-hidden');
    }
}

function syncHomepageUserAccountUI(sectionId) {
    sectionId = sectionId || getActiveSectionId();
    const loggedIn = isUserSessionLoggedIn();
    const onHomepage = sectionId === 'main-page';
    const user = getCurrentUser();
    const banner = ensureUserWelcomeBanner() || document.getElementById('user-welcome-banner');

    restoreAccountManagementToAccountPage();

    if (banner) {
        if (loggedIn && onHomepage && user) {
            const welcomeText = document.getElementById('user-welcome-text');
            const emailText = document.getElementById('user-welcome-email');
            if (welcomeText) welcomeText.textContent = 'Welcome back, ' + (user.name || 'PetFinder User') + '!';
            if (emailText) {
                emailText.textContent = user.email
                    ? 'Signed in as ' + user.email
                    : 'You are now signed in and can see the latest reports.';
            }
            banner.style.display = 'block';
            banner.classList.remove('homepage-account-hidden');
            setTimeout(positionUserBannerAboveHero, 0);

            const initials = (user.name || 'U').split(' ').map(function (s) { return s[0]; }).join('').slice(0, 2).toUpperCase();
            const initialsEl = document.getElementById('nav-user-initials');
            if (initialsEl) initialsEl.textContent = initials;
            const navAccount = document.getElementById('nav-account');
            const navUserBtn = document.getElementById('navUserBtn');
            if (navUserBtn) navUserBtn.title = user.name + (user.email ? ' — ' + user.email : '');
            if (navAccount) {
                navAccount.classList.remove('d-none', 'nav-user-logout-hidden');
                navAccount.classList.add('d-flex', 'nav-user-visible');
            }
            bindNavAccountDropdown();

            displayMyAccountProfile();
            renderOwnerNotificationsPanel();
        } else {
            banner.style.display = 'none';
            banner.classList.add('homepage-account-hidden');
            renderOwnerNotificationsPanel();
        }
    } else {
        renderOwnerNotificationsPanel();
    }
}

function initNavbarLogoutVisibility() {
    enforceNavbarLogoutVisibility(getActiveSectionId());
}

function hideDuplicateCombinedNavAuthButton(sectionId) {
    const navAuth = document.getElementById('nav-auth-btn');
    const loginBtn = document.getElementById('nav-login-btn');
    const registerBtn = document.getElementById('nav-register-btn');
    if (!navAuth) return;

    sectionId = sectionId || getActiveSectionId();
    const label = navAuth.textContent.replace(/\s+/g, ' ').trim();
    const isCombinedLogin = /login\s*\/\s*register/i.test(label);
    const hasSeparateButtons = !!(loginBtn && registerBtn);
    const onPageWithAuthForms = sectionId === 'landing-page' || sectionId === 'auth-page';

    if (isCombinedLogin && (hasSeparateButtons || onPageWithAuthForms)) {
        navAuth.classList.add('nav-combined-auth-hidden');
    } else {
        navAuth.classList.remove('nav-combined-auth-hidden');
    }
}

function hideLandingNavLoginRegisterOnSection(sectionId) {
    const hideNavLoginRegister = sectionId === 'landing-page' || sectionId === 'auth-page';
    const loginBtn = document.getElementById('nav-login-btn');
    const registerBtn = document.getElementById('nav-register-btn');

    [loginBtn, registerBtn].forEach(function (btn) {
        if (!btn) return;
        if (hideNavLoginRegister) btn.classList.add('landing-nav-hidden');
        else btn.classList.remove('landing-nav-hidden');
    });

    document.body.classList.toggle('on-auth-page', sectionId === 'auth-page');
    document.body.classList.toggle('on-landing-page', sectionId === 'landing-page');

    hideDuplicateCombinedNavAuthButton(sectionId);
}

function initHideLandingNavLoginRegister() {
    const currentShowSection = window.showSection;
    window.showSection = function (sectionId) {
        if (typeof currentShowSection === 'function') {
            currentShowSection(sectionId);
        }
        if (sectionId === 'my-account-page') {
            fixMyAccountHeroBackButton();
        }
        enforceNavbarLogoutVisibility(sectionId);
    };

    enforceNavbarLogoutVisibility(getActiveSectionId());
}

(function wrapAuthNavForDuplicateButton() {
    const originalDisplayAuth = displayAuthenticatedUser;
    window.displayAuthenticatedUser = function (fullName, email, location, contact) {
        if (!isUserSessionLoggedIn()) return;
        originalDisplayAuth(fullName, email, location, contact);
        enforceNavbarLogoutVisibility(getActiveSectionId());
    };

    const originalLogout = logoutUser;
    window.logoutUser = function () {
        sessionStorage.removeItem('petfinderLoggedIn');
        originalLogout();
        syncHomepageUserAccountUI('landing-page');
        enforceNavbarLogoutVisibility('landing-page');
        updateLandingAuthNotice();
    };
})();

// ========== REGISTER FIRST, THEN LOGIN (required verification) ==========
function getRegisteredAccount() {
    const stored = localStorage.getItem('petfinderRegisteredAccount');
    if (stored) return JSON.parse(stored);

    const legacyUser = localStorage.getItem('currentUser');
    if (legacyUser) {
        const user = JSON.parse(legacyUser);
        saveRegisteredAccount({
            name: user.name,
            email: user.email,
            contact: user.contact || '',
            location: user.location,
            password: user.password || ''
        });
        return getRegisteredAccount();
    }
    return null;
}

function getAccountPasswords() {
    try {
        return JSON.parse(localStorage.getItem('petfinderAccountPasswords') || '{}');
    } catch (e) {
        return {};
    }
}

function setAccountPassword(email, password) {
    if (!email || !password) return;
    const map = getAccountPasswords();
    map[String(email).toLowerCase()] = password;
    localStorage.setItem('petfinderAccountPasswords', JSON.stringify(map));
}

function normalizeUserRole(role) {
    const value = String(role || 'user').toLowerCase();
    return value === 'admin' ? 'admin' : 'user';
}

function tryLoginFromUserDirectory(name, email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedName = String(name || '').trim().toLowerCase();
    const passwords = getAccountPasswords();

    if (!normalizedEmail || !normalizedName || passwords[normalizedEmail] !== password) {
        return null;
    }

    const users = JSON.parse(localStorage.getItem('petfinderUsers') || '[]');
    const user = users.find(function (u) {
        return u && u.email && String(u.email).toLowerCase() === normalizedEmail;
    });

    if (!user || String(user.name || '').trim().toLowerCase() !== normalizedName) {
        return null;
    }

    if (normalizeUserRole(user.role) === 'admin') {
        return null;
    }

    return {
        name: user.name,
        email: user.email,
        location: user.location || '',
        contact: user.contact || ''
    };
}

function handleAdminAddUser(event) {
    if (event) event.preventDefault();

    const name = document.getElementById('adminNewUserName')?.value.trim();
    const email = document.getElementById('adminNewUserEmail')?.value.trim();
    const location = document.getElementById('adminNewUserLocation')?.value.trim() || '';
    const password = document.getElementById('adminNewUserPassword')?.value || '';
    const role = normalizeUserRole(document.getElementById('adminNewUserRole')?.value);

    const errEl = document.getElementById('adminAddUserError');
    const successEl = document.getElementById('adminAddUserSuccess');

    function showAdminAddUserError(message) {
        if (successEl) successEl.style.display = 'none';
        if (!errEl) return;
        errEl.textContent = message;
        errEl.style.display = 'block';
    }

    function showAdminAddUserSuccess(message) {
        if (errEl) errEl.style.display = 'none';
        if (!successEl) return;
        successEl.textContent = message;
        successEl.style.display = 'block';
    }

    if (!name || !email || !password) {
        showAdminAddUserError('Please fill in full name, email, and password.');
        return;
    }

    const normalizedEmail = email.toLowerCase();
    userAccounts = JSON.parse(localStorage.getItem('petfinderUsers') || '[]');
    const duplicate = userAccounts.some(function (u) {
        return u && u.email && String(u.email).toLowerCase() === normalizedEmail;
    });

    if (duplicate) {
        showAdminAddUserError('A user with this email already exists.');
        return;
    }

    const newUser = {
        id: generateUserId(),
        name: name,
        email: email,
        location: location,
        role: role,
        createdAt: new Date().toISOString()
    };

    userAccounts.push(newUser);
    localStorage.setItem('petfinderUsers', JSON.stringify(userAccounts));
    setAccountPassword(email, password);
    appendRegisteredClientRecord(newUser, role);

    const form = document.getElementById('adminAddUserForm');
    if (form) form.reset();

    showAdminAddUserSuccess('User "' + name + '" added successfully.');
    if (typeof applyAdminUsersFilters === 'function') {
        applyAdminUsersFilters();
    }
}

function appendRegisteredClientRecord(account, role) {
    if (!account || !account.email) return;

    const key = 'petfinderRegisteredClients';
    let list = [];
    try {
        list = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
        list = [];
    }

    const email = String(account.email).toLowerCase();
    const existingIndex = list.findIndex(function (c) {
        return c && String(c.email || '').toLowerCase() === email;
    });

    const record = {
        id: existingIndex >= 0 ? list[existingIndex].id : ('client_' + Date.now()),
        name: account.name || '',
        email: account.email,
        location: account.location || '',
        contact: account.contact || '',
        role: role || (existingIndex >= 0 ? list[existingIndex].role : 'user'),
        registeredAt: existingIndex >= 0
            ? (list[existingIndex].registeredAt || new Date().toISOString())
            : new Date().toISOString()
    };

    if (existingIndex >= 0) {
        list[existingIndex] = { ...list[existingIndex], ...record };
    } else {
        list.unshift(record);
    }

    localStorage.setItem(key, JSON.stringify(list));
}

function saveRegisteredAccount(account) {
    localStorage.setItem('petfinderRegisteredAccount', JSON.stringify(account));
    if (account && account.password) {
        setAccountPassword(account.email, account.password);
    }

    if (account && account.email) {
        let users = JSON.parse(localStorage.getItem('petfinderUsers') || '[]');
        const emailKey = String(account.email).toLowerCase();
        const existingIndex = users.findIndex(function (u) {
            return u && u.email && String(u.email).toLowerCase() === emailKey;
        });

        const userRecord = {
            id: existingIndex >= 0 ? users[existingIndex].id : ('user_' + emailKey.replace(/[^a-z0-9]/g, '_')),
            name: account.name || account.email,
            email: account.email,
            location: account.location || '',
            contact: account.contact || '',
            role: 'user',
            createdAt: existingIndex >= 0
                ? (users[existingIndex].createdAt || new Date().toISOString())
                : new Date().toISOString()
        };

        if (existingIndex >= 0) {
            users[existingIndex] = { ...users[existingIndex], ...userRecord };
        } else {
            users.push(userRecord);
        }

        localStorage.setItem('petfinderUsers', JSON.stringify(users));
        userAccounts = users;
    }

    recordClientRegistration(account);
}

function recordClientRegistration(account) {
    if (!account || !account.email) return;
    if (!shouldShowInRegisteredClientsList(account)) return;

    appendRegisteredClientRecord({
        name: account.name || '',
        email: String(account.email).trim(),
        location: account.location || '',
        contact: account.contact || '',
        registeredAt: new Date().toISOString()
    }, 'user');
}

function syncRegisteredClientsDirectory() {
    try {
        JSON.parse(localStorage.getItem('petfinderUsers') || '[]').forEach(function (u) {
            if (!shouldShowInRegisteredClientsList(u)) return;
            appendRegisteredClientRecord({
                name: u.name,
                email: u.email,
                location: u.location || '',
                contact: u.contact || '',
                registeredAt: u.createdAt || u.registeredAt
            }, 'user');
        });
    } catch (e) {}

    try {
        const registered = JSON.parse(localStorage.getItem('petfinderRegisteredAccount') || 'null');
        if (registered && shouldShowInRegisteredClientsList(registered)) {
            recordClientRegistration(registered);
        }
    } catch (e) {}
}

function resolveAccountRoleForEmail(email) {
    const emailKey = String(email || '').toLowerCase();
    try {
        const users = JSON.parse(localStorage.getItem('petfinderUsers') || '[]');
        const match = users.find(function (u) {
            return u && u.email && String(u.email).toLowerCase() === emailKey;
        });
        if (match && String(match.role || '').toLowerCase() === 'admin') return 'admin';
    } catch (e) {}
    try {
        const admins = JSON.parse(localStorage.getItem('petfinderAdminAccounts') || '[]');
        if (admins.some(function (a) {
            return a && a.email && String(a.email).toLowerCase() === emailKey;
        })) return 'admin';
    } catch (e) {}
    return 'user';
}

function recordLoggedInUser(name, email, location, contact) {
    if (!email) return;
    if (isExcludedFromRegisteredUsersRecord(email)) return;

    const key = 'petfinderLoggedInUsers';
    let list = [];
    try {
        list = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
        list = [];
    }

    const emailKey = String(email).toLowerCase();
    const existingIndex = list.findIndex(function (c) {
        return c && String(c.email || '').toLowerCase() === emailKey;
    });
    const now = new Date().toISOString();
    const existing = existingIndex >= 0 ? list[existingIndex] : null;
    const record = {
        id: existing ? existing.id : ('client_' + Date.now()),
        name: name || '',
        email: email,
        location: location || (existing && existing.location) || '',
        contact: contact !== undefined && contact !== '' ? contact : (existing && existing.contact) || '',
        role: resolveAccountRoleForEmail(email),
        registeredAt: existing && existing.registeredAt ? existing.registeredAt : now,
        lastLoginAt: now
    };

    if (existingIndex >= 0) {
        list[existingIndex] = { ...existing, ...record };
    } else {
        list.unshift(record);
    }

    localStorage.setItem(key, JSON.stringify(list));
}

function getAllRegisteredClientsForAdmin() {
    syncRegisteredClientsDirectory();
    pruneEmbeddedAdminsFromRegisteredClients();

    const clients = [];
    const seen = {};

    function pushClient(entry) {
        if (!shouldShowInRegisteredClientsList(entry)) return;

        const emailKey = String(entry.email).toLowerCase();
        if (seen[emailKey]) return;
        seen[emailKey] = true;

        clients.push({
            id: entry.id || ('client_' + emailKey.replace(/[^a-z0-9]/g, '_')),
            name: entry.name || '',
            email: entry.email,
            location: entry.location || '',
            contact: entry.contact || '',
            role: 'user',
            registeredAt: entry.registeredAt || entry.createdAt || ''
        });
    }

    try {
        JSON.parse(localStorage.getItem('petfinderRegisteredClients') || '[]').forEach(pushClient);
    } catch (e) {}

    try {
        JSON.parse(localStorage.getItem('petfinderUsers') || '[]').forEach(pushClient);
    } catch (e) {}

    try {
        const registered = JSON.parse(localStorage.getItem('petfinderRegisteredAccount') || 'null');
        if (registered && registered.email) {
            pushClient(registered);
        }
    } catch (e) {}

    return clients;
}

function hasRegisteredAccount() {
    return !!getRegisteredAccount();
}

function demoteRegisteredOnlySession() {
    if (!isUserSessionLoggedIn()) {
        sessionStorage.removeItem('petfinderLoggedIn');
        localStorage.removeItem('currentUser');
        resetNavbarToGuestState();
    }
}

function resetNavbarToGuestState() {
    const navAccount = document.getElementById('nav-account');
    const navAuth = document.getElementById('nav-auth-btn');
    const loginBtn = document.getElementById('nav-login-btn');
    const registerBtn = document.getElementById('nav-register-btn');
    const banner = document.getElementById('user-welcome-banner');

    if (banner) banner.style.display = 'none';
    if (navAccount) {
        navAccount.classList.remove('d-flex', 'nav-user-visible');
        navAccount.classList.add('d-none', 'nav-user-logout-hidden');
        closeNavAccountDropdown();
    }
    if (navAuth) {
        navAuth.classList.remove('nav-logout-visible');
        navAuth.classList.add('nav-logout-hidden', 'auth-hidden');
    }
    if (loginBtn) loginBtn.classList.remove('auth-hidden', 'nav-login-register-hidden');
    if (registerBtn) registerBtn.classList.remove('auth-hidden', 'nav-login-register-hidden');
}

function isValidGmailAddress(email) {
    const normalized = (email || '').trim().toLowerCase();
    return /^[a-z0-9._%+-]+@gmail\.com$/.test(normalized);
}

function getRegisterPasswordError(password) {
    if (!password) return 'Please enter a password.';
    if (password.length < 8 || password.length > 12) {
        return 'Password must be 8 to 12 characters long.';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must include at least one capital letter.';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must include at least one number.';
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        return 'Password must include at least one symbol.';
    }
    return '';
}

function isValidRegisterPassword(password) {
    return !getRegisterPasswordError(password);
}

function sanitizeContactDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

function bindNumericContactInput(input) {
    if (!input || input.dataset.numericContactBound === 'true') return;

    const applyDigitsOnly = function () {
        const digits = sanitizeContactDigits(input.value);
        if (input.value !== digits) {
            input.value = digits;
        }
    };

    input.addEventListener('input', applyDigitsOnly);
    input.addEventListener('paste', function (event) {
        event.preventDefault();
        const pasted = (event.clipboardData || window.clipboardData).getData('text');
        input.value = sanitizeContactDigits(pasted);
    });
    input.addEventListener('keypress', function (event) {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const key = event.key;
        if (key.length === 1 && !/\d/.test(key)) {
            event.preventDefault();
        }
    });

    input.dataset.numericContactBound = 'true';
    applyDigitsOnly();
}

function initNumericContactInputs() {
    document.querySelectorAll('.numeric-contact-input, #regContact, #registerContact, #editMyContact')
        .forEach(bindNumericContactInput);
}

function getRegisterContactError(contact) {
    if (!contact) return 'Please enter your contact number.';
    if (!/^\d+$/.test(String(contact))) {
        return 'Contact number must contain numbers only.';
    }
    if (contact.length < 10 || contact.length > 13) {
        return 'Please enter a valid contact number (e.g. 09123456789).';
    }
    return '';
}

function isValidRegisterContact(contact) {
    return !getRegisterContactError(contact);
}

function initPasswordToggleButtons() {
    document.querySelectorAll('[data-password-toggle]').forEach(function (btn) {
        if (btn.dataset.bound === 'true') return;

        btn.addEventListener('click', function () {
            const inputId = btn.getAttribute('data-password-toggle');
            const input = inputId ? document.getElementById(inputId) : null;
            if (!input) return;

            const showPassword = input.type === 'password';
            input.type = showPassword ? 'text' : 'password';
            btn.classList.toggle('is-visible', showPassword);
            btn.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');
        });

        btn.dataset.bound = 'true';
    });
}

function injectLoginFullNameField() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm || document.getElementById('loginFullName')) return;

    const emailGroup = document.getElementById('loginEmail')?.closest('.mb-3');
    if (!emailGroup) return;

    const fullNameGroup = document.createElement('div');
    fullNameGroup.className = 'mb-3';
    fullNameGroup.innerHTML = `
      <label for="loginFullName" class="form-label fw-bold small text-secondary">Full Name</label>
      <input type="text" class="form-control py-2" id="loginFullName" placeholder="Juan Dela Cruz" required autocomplete="name">`;

    loginForm.insertBefore(fullNameGroup, emailGroup);
}

function configureGmailEmailFields() {
    const loginEmail = document.getElementById('loginEmail');
    const regEmail = document.getElementById('regEmail')
        || document.getElementById('registerEmail');

    [loginEmail, regEmail].forEach(function (input) {
        if (!input) return;
        input.placeholder = 'name@gmail.com';
        input.setAttribute('title', 'Gmail address only (e.g. name@gmail.com)');
        input.classList.add('gmail-email-input');
    });

    if (loginEmail && !document.getElementById('loginGmailHint')) {
        const hint = document.createElement('small');
        hint.id = 'loginGmailHint';
        hint.className = 'gmail-email-hint text-muted d-block mt-1';
        hint.textContent = 'Gmail address only (e.g. juan@gmail.com)';
        loginEmail.closest('.mb-3')?.appendChild(hint);
    }

    if (regEmail && !document.getElementById('registerGmailHint')) {
        const hint = document.createElement('small');
        hint.id = 'registerGmailHint';
        hint.className = 'gmail-email-hint text-muted d-block mt-1';
        hint.textContent = 'Gmail address only (e.g. juan@gmail.com)';
        regEmail.closest('.mb-3')?.appendChild(hint);
    }
}

function focusLoginForm(focusPassword) {
    setTimeout(function () {
        if (focusPassword) {
            const loginPassword = document.getElementById('loginPassword');
            if (loginPassword) {
                loginPassword.focus();
                loginPassword.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
        }

        const loginFullName = document.getElementById('loginFullName');
        if (loginFullName) {
            loginFullName.focus();
            loginFullName.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        const loginEmail = document.getElementById('loginEmail');
        if (loginEmail) {
            loginEmail.focus();
            loginEmail.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 120);
}

function showRegisterSuccessNotice() {
    let notice = document.getElementById('register-success-notice');
    const loginPage = document.getElementById('login-page');

    if (!notice && loginPage) {
        notice = document.createElement('div');
        notice.id = 'register-success-notice';
        notice.className = 'alert alert-success small py-2 px-3 mb-3 rounded-3 border-0';
        notice.style.backgroundColor = 'rgba(110, 142, 118, 0.12)';
        notice.style.color = 'var(--dark-slate)';
        notice.innerHTML = '<strong> Account created!</strong>';
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.parentElement.insertBefore(notice, loginForm);
        } else {
            loginPage.insertBefore(notice, loginPage.firstChild);
        }
    } else if (notice) {
        notice.style.display = 'block';
    }
}

function hideRegisterSuccessNotice() {
    const notice = document.getElementById('register-success-notice');
    if (notice) notice.style.display = 'none';
}

function getRegisterFormValues() {
    const fullName = (
        document.getElementById('registerFullName')?.value ||
        document.getElementById('regName')?.value ||
        ''
    ).trim();
    const email = (
        document.getElementById('registerEmail')?.value ||
        document.getElementById('regEmail')?.value ||
        ''
    ).trim();
    const location = (document.getElementById('registerLocation')?.value || '').trim();
    const contact = sanitizeContactDigits(
        document.getElementById('registerContact')?.value ||
        document.getElementById('regContact')?.value ||
        ''
    );
    const passwordInput = document.getElementById('regPassword')
        || document.getElementById('regPassword');
    const password = passwordInput ? passwordInput.value : '';

    return { fullName, email, contact, location, password };
}

function redirectToMainAppAfterAuth() {
    if (!document.getElementById('main-page')) {
        window.location.href = 'index.html';
        return true;
    }
    return false;
}

function completeUserSession(name, email, location, contact, role) {
    sessionStorage.setItem('petfinderLoggedIn', 'true');
    const registered = getRegisteredAccount();
    const resolvedLocation = location || '';
    const resolvedContact = contact !== undefined ? contact : (registered && registered.contact) || '';
    const sessionUser = {
        name: name,
        email: email,
        location: resolvedLocation,
        contact: resolvedContact
    };
    if (role) sessionUser.role = role;
    localStorage.setItem('currentUser', JSON.stringify(sessionUser));
    recordLoggedInUser(name, email, resolvedLocation, resolvedContact);
}

function completeUserLogin(name, email, location, contact) {
    completeUserSession(name, email, location, contact);
    const user = getCurrentUser();
    displayAuthenticatedUser(name, email, location || '', user ? user.contact : contact || '');

    const guestDashboard = document.getElementById('guest-dashboard');
    if (guestDashboard) guestDashboard.classList.remove('active-section');

    if (typeof enforceNavbarLogoutVisibility === 'function') {
        enforceNavbarLogoutVisibility('main-page');
    }
    if (typeof syncHomepageUserAccountUI === 'function') {
        syncHomepageUserAccountUI('main-page');
    }
    if (typeof updateLandingAuthNotice === 'function') {
        updateLandingAuthNotice();
    }

    if (typeof refreshMapPinManagementUI === 'function') {
        refreshMapPinManagementUI();
    }
}

function showLoginAfterRegister(email) {
    sessionStorage.removeItem('petfinderLoggedIn');
    localStorage.removeItem('currentUser');
    resetNavbarToGuestState();

    const loginPage = document.getElementById('login-page');
    const registerPage = document.getElementById('register-page');
    if (loginPage && registerPage) {
        loginPage.style.display = 'block';
        registerPage.style.display = 'none';
    }

    const registered = getRegisteredAccount();
    const loginFullName = document.getElementById('loginFullName');
    const loginEmail = document.getElementById('loginEmail');
    if (loginFullName && registered) loginFullName.value = registered.name || '';
    if (loginEmail && email) loginEmail.value = email;

    if (document.getElementById('auth-page')) {
        showSection('auth-page');
        if (typeof enforceNavbarLogoutVisibility === 'function') {
            enforceNavbarLogoutVisibility('auth-page');
        }
    }

    if (typeof updateLandingAuthNotice === 'function') {
        updateLandingAuthNotice();
    }

    showRegisterSuccessNotice();
    focusLoginForm(true);
}

function handleSecureRegister(event) {
    if (event) event.preventDefault();

    const { fullName, email, contact, location, password } = getRegisterFormValues();

    if (!fullName || !email || !contact || !password) {
        return;
    }

    if (!isValidGmailAddress(email)) {
        return;
    }

    const contactError = getRegisterContactError(contact);
    if (contactError) {
        alert(contactError);
        return;
    }

    const passwordError = getRegisterPasswordError(password);
    if (passwordError) {
        return;
    }

    const newAccount = {
        name: fullName,
        email: email,
        contact: contact,
        location: location,
        password: password
    };

    const finishRegister = function () {
        const registerForm = document.getElementById('registerForm');
        if (registerForm) registerForm.reset();
        showLoginAfterRegister(email);
    };

    if (isWrongPreviewHost()) {
        return;
    }

    requirePetFinderDatabase(function () {
        PetFinderAPI.register(newAccount).then(function () {
            saveRegisteredAccount(newAccount);
            recordClientRegistration(newAccount);
            finishRegister();
        }).catch(function (err) {
            alert(err && err.message ? err.message : 'Registration failed. Please check your database connection.');
        });
    }, function () {
        alert('Database is not connected. Please make sure MySQL is running, phpMyAdmin works, and petfinder_db is created.');
    });
}

function handleSecureLogin(event) {
    if (event) event.preventDefault();
    hideLoginError();

    const loginFullName = (document.getElementById('loginFullName')?.value.trim() || '');
    const loginEmail = (document.getElementById('loginEmail')?.value.trim() || '').toLowerCase();
    const loginPassword = document.getElementById('loginPassword')?.value || '';

    if (!loginFullName) {
        showLoginError('Please enter your full name.');
        return;
    }
    if (!isValidGmailAddress(loginEmail)) {
        showLoginError('Please use a valid Gmail address (e.g. name@gmail.com).');
        return;
    }
    if (!loginPassword) {
        showLoginError('Please enter your password.');
        return;
    }

    if (isWrongPreviewHost()) {
        showLoginError('Open PetFinder through http://localhost/petfinder/ (not Live Server or file://).');
        return;
    }

    requirePetFinderDatabase(function () {
        PetFinderAPI.login(loginFullName, loginEmail, loginPassword).then(function (res) {
            const loginForm = document.getElementById('loginForm');
            if (loginForm) loginForm.reset();
            hideRegisterSuccessNotice();
            hideLoginError();
            completeUserSession(
                res.user.name,
                res.user.email,
                res.user.location,
                res.user.contact,
                res.user.role || 'user'
            );
            if (redirectToMainAppAfterAuth()) return;
            completeUserLogin(res.user.name, res.user.email, res.user.location, res.user.contact);
            showSection('main-page');
            renderOwnerNotificationsPanel();
        }).catch(function (err) {
            showLoginError(err && err.message ? err.message : 'Login failed. Please check your credentials.');
        });
    }, function () {
        handleSecureLoginLocal(loginFullName, loginEmail, loginPassword);
    });
}

function handleSecureLoginLocal(loginFullName, loginEmail, loginPassword) {
    const directoryLogin = tryLoginFromUserDirectory(loginFullName, loginEmail, loginPassword);
    if (directoryLogin) {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.reset();

        hideRegisterSuccessNotice();
        hideLoginError();
        completeUserSession(directoryLogin.name, directoryLogin.email, directoryLogin.location, directoryLogin.contact);

        if (redirectToMainAppAfterAuth()) return;

        completeUserLogin(directoryLogin.name, directoryLogin.email, directoryLogin.location, directoryLogin.contact);
        showSection('main-page');
        renderOwnerNotificationsPanel();
        return;
    }

    const registered = getRegisteredAccount();
    if (!registered) {
        redirectToRegisterForm();
        return;
    }

    const registeredEmail = (registered.email || '').toLowerCase();
    const registeredName = (registered.name || '').trim();

    if (!loginFullName) {
        showLoginError('Please enter your full name.');
        return;
    }

    if (!isValidGmailAddress(loginEmail)) {
        showLoginError('Please use a valid Gmail address (e.g. name@gmail.com).');
        return;
    }

    if (loginFullName.toLowerCase() !== registeredName.toLowerCase()) {
        showLoginError('Full name does not match your registered account.');
        return;
    }

    if (loginEmail !== registeredEmail) {
        showLoginError('Email does not match your registered account.');
        return;
    }

    if (loginPassword !== registered.password) {
        showLoginError('Incorrect password. Please try again.');
        return;
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.reset();

    hideRegisterSuccessNotice();
    hideLoginError();
    completeUserSession(registered.name, registered.email, registered.location, registered.contact);

    if (redirectToMainAppAfterAuth()) return;

    completeUserLogin(registered.name, registered.email, registered.location, registered.contact);
    showSection('main-page');
    renderOwnerNotificationsPanel();
}

function updateLandingAuthNotice() {
    const landingPage = document.getElementById('landing-page');
    if (!landingPage) return;

    let notice = document.getElementById('landing-login-notice');
    const registered = getRegisteredAccount();
    const loggedIn = isUserSessionLoggedIn();

    if (!registered || loggedIn) {
        if (notice) notice.style.display = 'none';
        return;
    }

    if (!notice) {
        notice = document.createElement('div');
        notice.id = 'landing-login-notice';
        notice.className = 'landing-login-notice custom-card p-4 mb-4';
        notice.innerHTML = `
          <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div>
              <h5 class="fw-bold mb-2" style="color: var(--primary-sage);"> Account Ready — Login Required</h5>
              <p class="text-muted mb-0 small">You already registered as <strong class="landing-notice-email"></strong>.
                Please log in to verify you are the owner of this account before using PetFinder.</p>
            </div>
            <button type="button" class="btn btn-sage fw-bold px-4 py-2 landing-notice-login-btn">LOG IN NOW</button>
          </div>`;
        const header = landingPage.querySelector('header');
        if (header) {
            header.insertAdjacentElement('afterend', notice);
        } else {
            landingPage.insertBefore(notice, landingPage.firstChild);
        }
        notice.querySelector('.landing-notice-login-btn').addEventListener('click', function () {
            if (document.getElementById('auth-page')) {
                showSection('auth-page');
                focusLoginForm();
            } else {
                window.location.href = 'auth.html';
            }
        });
    }

    const emailEl = notice.querySelector('.landing-notice-email');
    if (emailEl) emailEl.textContent = registered.email || registered.name;
    notice.style.display = 'block';
}

function initLandingPageAuthExperience() {
    const guestDashboard = document.getElementById('guest-dashboard');
    if (guestDashboard) guestDashboard.classList.remove('active-section');

    if (document.getElementById('main-page')) {
        initDefaultPageSection();
        updateLandingAuthNotice();
        return;
    }

    const hashSection = getHashSectionId();
    if (hashSection && isInfoSection(hashSection)) {
        showSection(hashSection);
        updateLandingAuthNotice();
        return;
    }

    if (isUserSessionLoggedIn()) {
        initLoggedInHomepage();
    } else if (document.getElementById('landing-page')) {
        showSection('landing-page');
    }

    updateLandingAuthNotice();
}

function initRegisterThenLoginFlow() {
    injectLoginFullNameField();
    initPasswordToggleButtons();
    configureGmailEmailFields();
    initNumericContactInputs();

    document.addEventListener('submit', function (event) {
        const form = event.target;
        if (!form || !form.id) return;

        if (form.id === 'registerForm') {
            event.preventDefault();
            event.stopImmediatePropagation();
            handleSecureRegister(event);
            return;
        }

        if (form.id === 'loginForm') {
            event.preventDefault();
            event.stopImmediatePropagation();
            handleSecureLogin(event);
        }
    }, true);

    window.handleLoginTrigger = function (event) {
        event.preventDefault();
        if (!hasRegisteredAccount()) {
            redirectToRegisterForm();
            return;
        }
        if (document.getElementById('auth-page')) {
            showSection('auth-page');
            focusLoginForm();
            return;
        }
        window.location.href = 'auth.html';
    };

    if (window.location.hash === '#register' && typeof toggleAuthForm === 'function') {
        toggleAuthForm('register');
        setTimeout(function () {
            const input = document.getElementById('regName');
            if (input) input.focus();
        }, 50);
    }

    setTimeout(function () {
        demoteRegisteredOnlySession();
        initLandingPageAuthExperience();
    }, 120);
}

function hideGuestDashboardPreviewOnLanding() {
    const landingPage = document.getElementById('landing-page');
    if (!landingPage) return;

    const headings = landingPage.querySelectorAll('h3');
    headings.forEach(function (heading) {
        if (heading.textContent.trim() === 'Guest Dashboard Preview') {
            const section = heading.closest('section');
            if (section) section.style.display = 'none';
        }
    });
}

let mapPinIncidents = {};
let activeMapPinKey = null;

const MAP_PIN_DEFAULT_SUMMARIES = {
    Poblacion: 'Last seen: Luna (Siamese Cat) near Market Plaza.',
    SanMiguel: 'Last seen: Buddy (Golden Retriever) at Brgy. Hall track.',
    SanJuan: 'Last seen: Max (Aspin Dog) beside the basketball court.',
    Bagumbayan: 'Last seen: Coco (Cockatiel Bird) at subdivision entrance.',
    SantaMaria: 'Last seen: Milo (Pug) near bakery intersection.',
    TanauanPlaza: 'Last seen: Bella (Shih Tzu) near park benches.',
    Pagaspas: 'Last seen: Oliver (Persian Cat) beside talipapa terminal.',
    Trapiche: 'Last seen: Rocky (German Shepherd) near highway bypass.'
};

function loadMapPinIncidents() {
    const stored = localStorage.getItem('petfinderMapPins');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (err) {
            return null;
        }
    }
    return null;
}

function buildDefaultMapPinIncidents() {
    const defaults = {};
    Object.keys(pinMockDatabase).forEach(function (key) {
        const pin = pinMockDatabase[key];
        const coords = getBarangayCoordsForMapKey(key);
        defaults[key] = {
            title: pin.title,
            emoji: getSpeciesMarkerLabel(pin.species || pin.breed || pin.name),
            species: pin.species || '',
            name: pin.name,
            breed: pin.breed,
            log: pin.log,
            summary: MAP_PIN_DEFAULT_SUMMARIES[key] || ('Last seen: ' + pin.name + ' (' + pin.breed + ').'),
            x: pin.x,
            y: pin.y,
            lat: coords ? coords.lat : undefined,
            lng: coords ? coords.lng : undefined
        };
    });
    return defaults;
}

function refreshGoogleMapMarkers() {
    if (typeof window.updateGoogleMapMarkers === 'function') {
        window.updateGoogleMapMarkers(mapPinIncidents || {});
    }
}

function saveMapPinIncidents() {
    localStorage.setItem('petfinderMapPins', JSON.stringify(mapPinIncidents));
    refreshGoogleMapMarkers();
}

function getMapPinListContainer() {
    return document.getElementById('mapPinListContainer')
        || document.querySelector('#map-page .col-xl-4 .d-flex.flex-column.gap-2')
        || document.querySelector('#map-page .col-lg-5 .d-flex.flex-column.gap-2');
}

function getSpeciesEmoji(species) {
    return getSpeciesMarkerLabel(species);
}

function guessSpeciesFromEmoji(value) {
    const legacy = {
        '🐕': 'Dog',
        '🐈': 'Cat',
        '🐾': 'Dog'
    };
    if (legacy[value]) return legacy[value];

    const normalized = String(value || '').trim().toLowerCase();
    const speciesList = ['Dog', 'Cat'];
    const byName = speciesList.find(function (species) {
        return species.toLowerCase() === normalized || species.toLowerCase().startsWith(normalized);
    });
    if (byName) return byName;

    const letter = String(value || '').trim().charAt(0).toUpperCase();
    const byLetter = speciesList.find(function (species) {
        return getSpeciesMarkerLabel(species) === letter;
    });
    return byLetter || 'Others';
}

function buildPinSummary(name, breed, log) {
    const shortLog = (log || '').length > 55 ? (log || '').slice(0, 55) + '…' : (log || '');
    return 'Last seen: ' + name + ' (' + breed + '). ' + shortLog;
}

function canManageMapPins() {
    return false;
}

function refreshMapPinManagementUI() {
    const addBtn = document.getElementById('mapPinAddBtn');
    if (addBtn) {
        addBtn.style.display = canManageMapPins() ? '' : 'none';
    }

    const bar = document.getElementById('mapPinDetailCrudBar');
    if (bar && !canManageMapPins()) {
        bar.style.display = 'none';
    }

    renderMapPinList();
}

function renderMapPinList() {
    const container = getMapPinListContainer();
    if (!container) return;

    if (!container.id) container.id = 'mapPinListContainer';

    const reports = Array.isArray(lostPetReports) ? lostPetReports.slice() : [];
    if (reports.length === 0) {
        container.innerHTML = '<p class="small text-muted text-center py-3">No incident pins yet.' +
            (canManageMapPins() ? ' Add one below.' : '') + '</p>';
        return;
    }

    container.innerHTML = reports.map(function (report) {
        const key = report.id;
        const pinData = mapPinIncidents[key];
        const summary = (pinData && pinData.summary)
            || ('Last seen: ' + report.name + ' (' + report.breed + ') at ' + report.location + '.');
        const locationLine = report.location
            ? '<small class="text-muted d-block mt-1">' + report.location + '</small>'
            : '';
        const detailsLine = report.details
            ? '<small class="text-muted d-block mt-1 map-pin-details-text">' + (report.details.length > 80 ? report.details.slice(0, 80) + '…' : report.details) + '</small>'
            : '';
        const statusBadge = getPetStatusBadgeHtml(report);
        const found = isPetFound(report);
        const itemOpacity = found ? ' style="opacity:0.75;"' : '';
        return `
      <div class="map-pin-list-item"${itemOpacity}>
        <button type="button" class="map-grid-button map-pin-select-btn${found ? ' map-pin-found-item' : ''}" id="pin-${key}" data-pin-key="${key}"${found ? ' disabled' : ''}>
          <div class="d-flex justify-content-between align-items-center gap-2">
            <strong class="small d-block">${report.name}</strong>
            ${statusBadge}
          </div>
          <small class="text-muted d-block mt-1 map-pin-summary-text">${summary}</small>
          ${locationLine}
          ${detailsLine}
        </button>
      </div>`;
    }).join('');

    container.querySelectorAll('.map-pin-select-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (btn.disabled) return;
            const pinKey = btn.getAttribute('data-pin-key');
            if (mapPinIncidents[pinKey]) {
                selectMapPin(pinKey);
            }
        });
    });
}

function applyMapPinToDetails(locationKey) {
    const data = mapPinIncidents[locationKey];
    const marker = document.getElementById('liveRadarMarker');
    const belowContainer = document.getElementById('belowMapDetailsContainer');
    if (!data || !marker || !belowContainer) return;

    activeMapPinKey = locationKey;

    marker.style.left = data.x;
    marker.style.top = data.y;
    marker.style.transform = 'translate(-50%, -50%) scale(1)';

    document.getElementById('belowMapTitle').textContent = data.title || data.name;
    document.getElementById('belowMapPetEmoji').textContent = getSpeciesMarkerLabel(data.species || data.breed || data.name);
    document.getElementById('belowMapPetName').textContent = data.name;
    document.getElementById('belowMapPetBreed').textContent = (data.breed || '—') + (data.species ? ' · ' + data.species : '');
    document.getElementById('belowMapLog').textContent = data.log || data.details || data.summary || '';

    belowContainer.style.display = 'block';
    updateMapPinDetailCrudBar(locationKey);

    if (typeof window.focusGoogleMapPin === 'function') {
        window.focusGoogleMapPin(locationKey);
    } else if (typeof window.focusOSMPin === 'function') {
        window.focusOSMPin(locationKey);
    }
}

function updateMapPinDetailCrudBar(locationKey) {
    const bar = document.getElementById('mapPinDetailCrudBar');
    if (!bar) return;
    if (!canManageMapPins()) {
        bar.style.display = 'none';
        return;
    }
    bar.style.display = locationKey ? 'flex' : 'none';
    bar.dataset.pinKey = locationKey || '';
}

function injectMapPinDetailCrudBar() {
    const belowContainer = document.getElementById('belowMapDetailsContainer');
    if (!belowContainer || document.getElementById('mapPinDetailCrudBar')) return;

    const card = belowContainer.querySelector('.card');
    if (!card) return;

    const bar = document.createElement('div');
    bar.id = 'mapPinDetailCrudBar';
    bar.className = 'map-pin-detail-crud d-flex flex-wrap gap-2 mt-3 pt-3 border-top';
    bar.style.display = 'none';
    bar.innerHTML = `
      <button type="button" class="btn btn-sm btn-sage fw-bold flex-fill" id="mapPinDetailEditBtn">Edit Incident</button>
      <button type="button" class="btn btn-sm btn-outline-danger fw-bold flex-fill" id="mapPinDetailDeleteBtn">Delete</button>`;
    card.appendChild(bar);

    document.getElementById('mapPinDetailEditBtn').addEventListener('click', function () {
        if (activeMapPinKey) openMapPinEditModal(activeMapPinKey);
    });
    document.getElementById('mapPinDetailDeleteBtn').addEventListener('click', function () {
        if (activeMapPinKey) handleDeleteMapPin(activeMapPinKey);
    });
}

function injectMapPinAddButton() {
    const mapPage = document.getElementById('map-page');
    if (!mapPage || document.getElementById('mapPinAddBtn')) return;

    const heading = mapPage.querySelector('h4');
    if (!heading || !heading.textContent.includes('Active Incident')) return;

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.id = 'mapPinAddBtn';
    addBtn.className = 'btn btn-sage btn-sm fw-bold w-100 mb-3';
    addBtn.textContent = 'Add Incident Pin';
    addBtn.style.display = canManageMapPins() ? '' : 'none';
    addBtn.addEventListener('click', openMapPinCreateModal);
    heading.insertAdjacentElement('afterend', addBtn);
}

function ensureMapPinCrudModal() {
    if (document.getElementById('mapPinCrudModal')) return;

    const modal = document.createElement('div');
    modal.id = 'mapPinCrudModal';
    modal.className = 'my-account-modal map-pin-crud-modal';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="my-account-box map-pin-crud-box">
        <button type="button" class="btn-close position-absolute top-0 end-0 m-3" id="mapPinCrudCloseBtn"></button>
        <h4 class="fw-bold mb-3" style="color: var(--primary-sage);" id="mapPinCrudModalTitle">Edit Incident Pin</h4>
        <form id="mapPinCrudForm">
          <input type="hidden" id="mapPinCrudKey">
          <div class="mb-2">
            <label class="form-label fw-semibold small">Location Title</label>
            <input type="text" class="form-control py-1.5" id="mapPinCrudTitle" required placeholder="e.g. Barangay San Miguel">
          </div>
          <div class="row g-2">
            <div class="col-6">
              <label class="form-label fw-semibold small">Pet Name</label>
              <input type="text" class="form-control py-1.5" id="mapPinCrudName" required>
            </div>
            <div class="col-6">
              <label class="form-label fw-semibold small">Species</label>
              <select class="form-select py-1.5" id="mapPinCrudSpecies" required>
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>
          <div class="mb-2 mt-2">
            <label class="form-label fw-semibold small">Breed</label>
            <input type="text" class="form-control py-1.5" id="mapPinCrudBreed" required placeholder="e.g. Golden Retriever">
          </div>
          <div class="mb-2">
            <label class="form-label fw-semibold small">Sighting Log</label>
            <textarea class="form-control py-1.5" id="mapPinCrudLog" rows="3" required></textarea>
          </div>
          <div class="mb-2">
            <label class="form-label fw-semibold small">List Summary (short text on pin list)</label>
            <input type="text" class="form-control py-1.5" id="mapPinCrudSummary" placeholder="Auto-generated if empty">
          </div>
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label fw-semibold small">Map X (%)</label>
              <input type="text" class="form-control py-1.5" id="mapPinCrudX" placeholder="e.g. 50%">
            </div>
            <div class="col-6">
              <label class="form-label fw-semibold small">Map Y (%)</label>
              <input type="text" class="form-control py-1.5" id="mapPinCrudY" placeholder="e.g. 50%">
            </div>
          </div>
          <div class="d-flex gap-2">
            <button type="submit" class="btn btn-sage fw-bold flex-fill py-2">Save</button>
            <button type="button" class="btn btn-outline-secondary fw-bold flex-fill py-2" id="mapPinCrudCancelBtn">Cancel</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal);

    document.getElementById('mapPinCrudForm').addEventListener('submit', handleSaveMapPin);
    document.getElementById('mapPinCrudCancelBtn').addEventListener('click', closeMapPinCrudModal);
    document.getElementById('mapPinCrudCloseBtn').addEventListener('click', closeMapPinCrudModal);
    modal.addEventListener('click', function (event) {
        if (event.target === modal) closeMapPinCrudModal();
    });
}

function openMapPinEditModal(locationKey) {
    if (!canManageMapPins()) return;

    const data = mapPinIncidents[locationKey];
    if (!data) return;

    ensureMapPinCrudModal();
    document.getElementById('mapPinCrudModalTitle').textContent = 'Edit Incident Pin';
    document.getElementById('mapPinCrudKey').value = locationKey;
    document.getElementById('mapPinCrudTitle').value = data.title;
    document.getElementById('mapPinCrudName').value = data.name;
    document.getElementById('mapPinCrudSpecies').value = guessSpeciesFromEmoji(data.emoji);
    document.getElementById('mapPinCrudBreed').value = data.breed;
    document.getElementById('mapPinCrudLog').value = data.log;
    document.getElementById('mapPinCrudSummary').value = data.summary || '';
    document.getElementById('mapPinCrudX').value = data.x || '50%';
    document.getElementById('mapPinCrudY').value = data.y || '50%';
    document.getElementById('mapPinCrudModal').style.display = 'flex';
}

function openMapPinCreateModal() {
    if (!canManageMapPins()) return;

    ensureMapPinCrudModal();
    document.getElementById('mapPinCrudModalTitle').textContent = 'Add Incident Pin';
    document.getElementById('mapPinCrudKey').value = '';
    document.getElementById('mapPinCrudForm').reset();
    document.getElementById('mapPinCrudX').value = '50%';
    document.getElementById('mapPinCrudY').value = '50%';
    document.getElementById('mapPinCrudModal').style.display = 'flex';
}

function closeMapPinCrudModal() {
    const modal = document.getElementById('mapPinCrudModal');
    if (modal) modal.style.display = 'none';
}

function generateMapPinKey(title) {
    const base = (title || 'Pin').replace(/[^a-zA-Z0-9]/g, '') || 'Pin';
    return base + '_' + Date.now();
}

function handleSaveMapPin(event) {
    event.preventDefault();

    if (!canManageMapPins()) return;

    const existingKey = document.getElementById('mapPinCrudKey').value.trim();
    const title = document.getElementById('mapPinCrudTitle').value.trim();
    const name = document.getElementById('mapPinCrudName').value.trim();
    const species = document.getElementById('mapPinCrudSpecies').value;
    const breed = document.getElementById('mapPinCrudBreed').value.trim();
    const log = document.getElementById('mapPinCrudLog').value.trim();
    let summary = document.getElementById('mapPinCrudSummary').value.trim();
    const x = document.getElementById('mapPinCrudX').value.trim() || '50%';
    const y = document.getElementById('mapPinCrudY').value.trim() || '50%';

    if (!title || !name || !breed || !log) {
        return;
    }

    if (!summary) summary = buildPinSummary(name, breed, log);

    const key = existingKey || generateMapPinKey(title);
    const coords = getBarangayCoordsForMapKey(key) || getBarangayCoordsForMapKey(guessMapKeyFromLocation(title));

    const pinData = {
        title: title,
        emoji: getSpeciesEmoji(species),
        name: name,
        breed: breed,
        log: log,
        summary: summary,
        x: x,
        y: y,
        lat: coords ? coords.lat : undefined,
        lng: coords ? coords.lng : undefined
    };
    mapPinIncidents[key] = pinData;
    saveMapPinIncidents();
    renderMapPinList();
    closeMapPinCrudModal();
    selectMapPin(key);
}

function handleDeleteMapPin(locationKey) {
    if (!canManageMapPins()) return;
    if (!mapPinIncidents[locationKey]) return;

    delete mapPinIncidents[locationKey];
    saveMapPinIncidents();
    renderMapPinList();

    if (activeMapPinKey === locationKey) {
        activeMapPinKey = null;
        resetMapCanvas();
    }

}



function initMapPinIncidentsCRUD() {
    syncAllLostPetReportsToMap();

    injectMapPinAddButton();
    injectMapPinDetailCrudBar();
    ensureMapPinCrudModal();
    renderMapPinList();

    const originalSelectMapPin = window.selectMapPin;
    window.selectMapPin = function (locationKey) {
        const buttons = document.querySelectorAll('.map-grid-button');
        buttons.forEach(function (btn) { btn.classList.remove('active-pin'); });

        const activeBtn = document.getElementById('pin-' + locationKey);
        if (activeBtn) activeBtn.classList.add('active-pin');

        if (mapPinIncidents[locationKey]) {
            applyMapPinToDetails(locationKey);
        } else if (typeof originalSelectMapPin === 'function') {
            originalSelectMapPin(locationKey);
        }
    };

    window.resetMapCanvas = function () {
        const buttons = document.querySelectorAll('.map-grid-button');
        buttons.forEach(function (btn) { btn.classList.remove('active-pin'); });
        const marker = document.getElementById('liveRadarMarker');
        if (marker) marker.style.transform = 'translate(-50%, -50%) scale(0)';
        const belowContainer = document.getElementById('belowMapDetailsContainer');
        if (belowContainer) belowContainer.style.display = 'none';
        activeMapPinKey = null;
        updateMapPinDetailCrudBar(null);
    };

    window.focusMapLocation = function (locationKey) {
        showSection('map-page');
        setTimeout(function () { selectMapPin(locationKey); }, 150);
    };

    const showSectionRef = window.showSection;
    window.showSection = function (sectionId) {
        if (typeof showSectionRef === 'function') showSectionRef(sectionId);
        if (sectionId === 'map-page' || sectionId === 'main-page') {
            if (typeof refreshLostPetReportsFromBackend === 'function') {
                refreshLostPetReportsFromBackend(function () {
                    setTimeout(refreshMapPinManagementUI, 0);
                });
                return;
            }
        }
        if (sectionId === 'map-page') {
            setTimeout(refreshMapPinManagementUI, 0);
        }
    };

    if (!window.__petfinderReportsFocusBound) {
        window.addEventListener('focus', function () {
            if (typeof refreshLostPetReportsFromBackend === 'function') {
                refreshLostPetReportsFromBackend();
            }
        });
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState !== 'visible') return;
            if (typeof refreshLostPetReportsFromBackend === 'function') {
                refreshLostPetReportsFromBackend();
            }
        });
        window.__petfinderReportsFocusBound = true;
    }

    if (!window.__petfinderMapRefreshInterval) {
        window.__petfinderMapRefreshInterval = setInterval(function () {
            const mapPage = document.getElementById('map-page');
            if (!mapPage || !mapPage.classList.contains('active-section')) return;
            if (typeof refreshLostPetReportsFromBackend === 'function') {
                refreshLostPetReportsFromBackend();
            }
        }, 15000);
    }

    wrapFocusMapLocationForSightingNotify();
}

document.addEventListener('DOMContentLoaded', function () {
    initMapPinIncidentsCRUD();

    if (typeof window.__googleMapReady === 'function') {
        window.__googleMapReady().then(function () {
            if (typeof window.updateGoogleMapMarkers === 'function') {
                window.updateGoogleMapMarkers(mapPinIncidents || {});
            }
        }).catch(function () {
            setTimeout(function () {
                if (typeof window.updateGoogleMapMarkers === 'function') {
                    window.updateGoogleMapMarkers(mapPinIncidents || {});
                }
            }, 800);
        });
    } else if (typeof window.updateGoogleMapMarkers === 'function') {
        setTimeout(function () {
            window.updateGoogleMapMarkers(mapPinIncidents || {});
        }, 800);
    }
});

// ========== OWNER PET NOTIFICATIONS (per user only) ==========
function getAllOwnerNotifications() {
    try {
        return JSON.parse(localStorage.getItem('petfinderOwnerNotifications') || '[]');
    } catch (err) {
        return [];
    }
}

function saveAllOwnerNotifications(notifications) {
    localStorage.setItem('petfinderOwnerNotifications', JSON.stringify(notifications));
}

function getCurrentUserEmailKey() {
    const user = getCurrentUser();
    return user && user.email ? user.email.toLowerCase() : '';
}

function getActiveLostPetReportIds() {
    const ids = {};
    (lostPetReports || []).forEach(function (r) {
        if (r && r.id) ids[r.id] = true;
    });
    return ids;
}

function removeOwnerNotificationsForReport(reportId) {
    if (!reportId) return;
    const notifications = getAllOwnerNotifications().filter(function (n) {
        return n.reportId !== reportId;
    });
    saveAllOwnerNotifications(notifications);
    if (typeof renderOwnerNotificationsPanel === 'function') {
        renderOwnerNotificationsPanel();
    }
}

function pruneOwnerNotificationsForDeletedReports() {
    if (!Array.isArray(lostPetReports) || lostPetReports.length === 0) {
        return;
    }

    const activeIds = getActiveLostPetReportIds();
    const notifications = getAllOwnerNotifications();
    const pruned = notifications.filter(function (n) {
        return !n.reportId || activeIds[n.reportId];
    });
    if (pruned.length !== notifications.length) {
        saveAllOwnerNotifications(pruned);
    }
}

function getNotificationsForCurrentUser() {
    const email = getCurrentUserEmailKey();
    if (!email) return [];
    pruneOwnerNotificationsForDeletedReports();
    const activeIds = getActiveLostPetReportIds();
    return getAllOwnerNotifications()
        .filter(function (n) {
            if (n.ownerEmail !== email) return false;
            if (n.reportId && !activeIds[n.reportId]) return false;
            return true;
        })
        .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
}

function addOwnerPetNotification(ownerEmail, data) {
    if (!ownerEmail) return;

    const notifications = getAllOwnerNotifications();
    notifications.unshift({
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        ownerEmail: ownerEmail.toLowerCase(),
        read: false,
        createdAt: new Date().toISOString(),
        type: data.type,
        reportId: data.reportId,
        petName: data.petName,
        message: data.message
    });
    saveAllOwnerNotifications(notifications);
    renderOwnerNotificationsPanel();
}

function notifyOwnerPetPosted(report) {
    if (!report || !report.ownerEmail) return;

    addOwnerPetNotification(report.ownerEmail, {
        type: 'posted',
        reportId: report.id,
        petName: report.name,
        message: 'Posted on the homepage: "' + report.name + '". Community members can now view your report and submit sightings.'
    });
}

function notifyOwnerPetSighted(report, reporterName) {
    if (!report || !report.ownerEmail) return;

    addOwnerPetNotification(report.ownerEmail, {
        type: 'sighted',
        reportId: report.id,
        petName: report.name,
        message: (reporterName || 'A community member') + ' reported a sighting of ' + report.name + ' near ' + report.location + '. Check the Community Map for details.'
    });
}

function findLostPetReportByMapKey(mapKey) {
    return lostPetReports.find(function (r) { return r.mapKey === mapKey; });
}

function notifySightingForMapKey(mapKey) {
    const report = findLostPetReportByMapKey(mapKey);
    if (!report || !report.ownerEmail) return;

    const reporterEmail = getCurrentUserEmailKey();
    if (reporterEmail && reporterEmail === report.ownerEmail) return;

    const recent = getAllOwnerNotifications().find(function (n) {
        return n.type === 'sighted' && n.reportId === report.id &&
            n.ownerEmail === report.ownerEmail &&
            Date.now() - new Date(n.createdAt).getTime() < 60000;
    });
    if (recent) return;

    const reporter = getCurrentUser();
    const reporterName = reporter ? reporter.name : 'A community member';
    notifyOwnerPetSighted(report, reporterName);
}

function submitPetSighting(reportId) {
    const report = lostPetReports.find(function (r) { return r.id === reportId; });
    if (!report) return;

    const reporterEmail = getCurrentUserEmailKey();
    if (report.ownerEmail && reporterEmail !== report.ownerEmail) {
        const reporter = getCurrentUser();
        notifyOwnerPetSighted(report, reporter ? reporter.name : 'A community member');
    }

    showSection('map-page');
    setTimeout(function () {
        if (typeof selectMapPin === 'function') {
            selectMapPin(report.mapKey);
        }
    }, 150);
}

function markOwnerNotificationRead(notificationId) {
    const email = getCurrentUserEmailKey();
    const notifications = getAllOwnerNotifications().map(function (n) {
        if (n.id === notificationId && n.ownerEmail === email) {
            return { ...n, read: true };
        }
        return n;
    });
    saveAllOwnerNotifications(notifications);
    renderOwnerNotificationsPanel();
}

function handleMarkPetReturned() {
    if (!activePetReportId) return;
    if (typeof isCurrentUserAdmin === 'function' && !isCurrentUserAdmin()) return;

    adminUpdatePetReportStatus(activePetReportId, true).then(function (updated) {
        if (!updated) return;
        populatePetDetailsView(updated);
        switchPetToViewMode();
    }).catch(function () {});
}

function formatNotificationTime(isoString) {
    try {
        return new Date(isoString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    } catch (err) {
        return '';
    }
}

function closeNavNotificationDropdown() {
    const dropdown = document.getElementById('navNotifDropdown');
    const bellBtn = document.getElementById('navNotifBellBtn');
    if (dropdown) dropdown.style.display = 'none';
    if (bellBtn) bellBtn.setAttribute('aria-expanded', 'false');
}

function toggleNavNotificationDropdown() {
    const dropdown = document.getElementById('navNotifDropdown');
    if (!dropdown) return;
    if (dropdown.style.display === 'block') {
        closeNavNotificationDropdown();
    } else {
        openNavNotificationDropdown();
    }
}

function bindNavNotificationBell() {
    const bellBtn = document.getElementById('navNotifBellBtn');
    if (!bellBtn || bellBtn.dataset.bound === 'true') return;

    bellBtn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        toggleNavNotificationDropdown();
    });
    bellBtn.dataset.bound = 'true';

    if (document.body.dataset.navNotifOutsideBound !== 'true') {
        document.addEventListener('click', function (event) {
            const notifWrap = document.getElementById('nav-notifications');
            const accountWrap = document.getElementById('nav-account');
            if (notifWrap && !notifWrap.contains(event.target)) {
                closeNavNotificationDropdown();
            }
            if (accountWrap && !accountWrap.contains(event.target)) {
                closeNavAccountDropdown();
            }
        });
        document.body.dataset.navNotifOutsideBound = 'true';
    }
}

function ensureOwnerNotificationsPanel() {
    bindNavNotificationBell();

    const oldPanel = document.getElementById('owner-notifications-panel');
    if (oldPanel) oldPanel.remove();
}

function renderOwnerNotificationsPanel() {
    ensureOwnerNotificationsPanel();

    const list = document.getElementById('ownerNotificationsList');
    const navBadge = document.getElementById('navNotifBellBadge');
    if (!list) return;

    const loggedIn = isUserSessionLoggedIn();
    const notifications = getNotificationsForCurrentUser();

    if (!loggedIn) {
        closeNavNotificationDropdown();
        return;
    }

    const unreadCount = notifications.filter(function (n) { return !n.read; }).length;
    if (navBadge) {
        if (unreadCount > 0) {
            navBadge.style.display = 'inline-flex';
            navBadge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
        } else {
            navBadge.style.display = 'none';
        }
    }

    if (notifications.length === 0) {
        list.innerHTML = '<p class="small text-muted mb-0 text-center py-3">No alerts yet. Report a lost pet to receive updates when it is posted, sighted, or returned.</p>';
        return;
    }

    list.innerHTML = notifications.map(function (n) {
        const typeLabel = n.type === 'posted'
            ? 'Posted'
            : (n.type === 'returned' ? 'Found' : 'Sighting');

        const badgeClass = n.type === 'posted'
            ? 'bg-success'
            : (n.type === 'returned' ? 'bg-success' : 'bg-warning text-dark');

        const unreadClass = n.read ? '' : ' owner-notif-item-unread';
        return `
      <div class="owner-notif-item${unreadClass}" data-notif-id="${n.id}">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <span class="badge ${badgeClass} me-1">${typeLabel}</span>
            <strong class="small">${n.petName}</strong>
            <p class="small mb-1 mt-2">${n.message}</p>
            <small class="text-muted">${formatNotificationTime(n.createdAt)}</small>
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-sage mt-2 owner-notif-mark-read" data-notif-id="${n.id}">
          ${n.read ? 'Read' : 'Mark as read'}
        </button>
      </div>`;
    }).join('');

    list.querySelectorAll('.owner-notif-mark-read').forEach(function (btn) {
        btn.addEventListener('click', function () {
            markOwnerNotificationRead(btn.getAttribute('data-notif-id'));
        });
    });
}

function hideAboutFaqsFromAppNavbar() {
    ['nav-about', 'nav-faqs'].forEach(function (id) {
        const link = document.getElementById(id);
        const item = link ? link.closest('.nav-item') : null;
        if (item) item.classList.add('d-none');
    });
}

function wrapFocusMapLocationForSightingNotify() {
    const currentFocus = window.focusMapLocation;
    window.focusMapLocation = function (locationKey) {
        notifySightingForMapKey(locationKey);
        if (typeof currentFocus === 'function') {
            currentFocus(locationKey);
        }
    };
}

function bindDistinctDetailsWarning() {
    const textarea = document.getElementById('reportDetails');
    const warningEl = document.getElementById('charWarning');
    if (!textarea || !warningEl) return;

    const update = function () {
        const len = (textarea.value || '').length;
        if (len >= 1500) warningEl.style.display = 'block';
        else warningEl.style.display = 'none';
    };

    textarea.addEventListener('input', update);
    textarea.addEventListener('keyup', update);

    // initial
    update();
}

function initOwnerPetNotifications() {
    hideAboutFaqsFromAppNavbar();
    ensureOwnerNotificationsPanel();
    wrapFocusMapLocationForSightingNotify();
    renderOwnerNotificationsPanel();
}

function buildMapPinFromLostReport(report, coordOffset) {
    const mapKey = report.mapKey || guessMapKeyFromLocation(report.location);
    const baseCoords = getBarangayCoordsForMapKey(mapKey);
    const defaultPin = (pinMockDatabase && pinMockDatabase[mapKey]) ? pinMockDatabase[mapKey] : null;
    const offset = coordOffset || { lat: 0, lng: 0 };

    const logParts = [];
    logParts.push('Species: ' + (report.species || '—'));
    logParts.push('Breed: ' + (report.breed || '—'));
    if (report.dateLost) logParts.push('Lost: ' + report.dateLost);
    if (report.details) logParts.push('Details: ' + report.details);

    const summary = 'Last seen: ' + report.name + ' (' + report.breed + ') at ' + report.location + '.';

    return {
        reportId: report.id,
        mapKey: mapKey,
        title: report.location || (defaultPin ? defaultPin.title : mapKey),
        emoji: report.emoji || getSpeciesEmojiForReport(report.species),
        name: report.name,
        breed: report.breed,
        species: report.species,
        log: logParts.join(' | '),
        summary: summary,
        details: report.details || '',
        dateLost: report.dateLost || '',
        returned: !!report.returned,
        geocodeScope: 'Tanauan City, Batangas, Philippines',
        lat: baseCoords ? baseCoords.lat + offset.lat : undefined,
        lng: baseCoords ? baseCoords.lng + offset.lng : undefined,
        x: defaultPin ? defaultPin.x : '50%',
        y: defaultPin ? defaultPin.y : '50%'
    };
}

function syncAllLostPetReportsToMap() {
    if (typeof lostPetReports === 'undefined') return;

    const activeReports = lostPetReports.filter(function (r) { return !r.returned; });
    const groupedByArea = {};

    activeReports.forEach(function (report) {
        const mapKey = report.mapKey || guessMapKeyFromLocation(report.location);
        if (!groupedByArea[mapKey]) groupedByArea[mapKey] = [];
        groupedByArea[mapKey].push(report);
    });

    const newPins = {};
    activeReports.forEach(function (report) {
        const mapKey = report.mapKey || guessMapKeyFromLocation(report.location);
        const group = groupedByArea[mapKey] || [report];
        const index = group.findIndex(function (r) { return r.id === report.id; });
        const total = group.length;
        let offset = { lat: 0, lng: 0 };

        if (total > 1 && index >= 0) {
            const angle = (index / total) * Math.PI * 2;
            const spread = 0.0018;
            offset = {
                lat: Math.sin(angle) * spread,
                lng: Math.cos(angle) * spread
            };
        }

        newPins[report.id] = buildMapPinFromLostReport(report, offset);
    });

    mapPinIncidents = newPins;

    if (typeof saveMapPinIncidents === 'function') {
        saveMapPinIncidents();
    } else {
        localStorage.setItem('petfinderMapPins', JSON.stringify(mapPinIncidents));
        if (typeof refreshGoogleMapMarkers === 'function') {
            refreshGoogleMapMarkers();
        }
    }

    if (typeof renderMapPinList === 'function') {
        renderMapPinList();
    }
}

function upsertMapIncidentFromLostReport(report) {
    syncAllLostPetReportsToMap();
}

