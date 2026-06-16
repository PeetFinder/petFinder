(function (global) {
    'use strict';

    function resolveApiBase() {
        if (global.PETFINDER_API_BASE) {
            return String(global.PETFINDER_API_BASE).replace(/\/$/, '');
        }
        return 'api';
    }

    const PetFinderAPI = {
        baseUrl: resolveApiBase(),
        useBackend: false,
        ready: false,
        lastError: '',
        initPromise: null,

        init() {
            if (!this.initPromise) {
                this.initPromise = this.checkHealth();
            }
            return this.initPromise;
        },

        async request(path, options) {
            const url = this.baseUrl + path;
            const config = Object.assign({
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            }, options || {});

            const response = await fetch(url, config);
            let data = null;
            try {
                data = await response.json();
            } catch (e) {
                data = { success: false, message: 'Invalid server response.' };
            }

            if (!response.ok || data.success === false) {
                const error = new Error(data.message || 'Request failed.');
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        },

        async checkHealth() {
            try {
                const data = await this.request('/health.php', { method: 'GET' });
                this.ready = !!data.backend;
                this.useBackend = !!data.backend;
                this.lastError = this.ready ? '' : (data.message || 'Database not connected.');
                return this.ready;
            } catch (e) {
                this.ready = false;
                this.useBackend = false;
                this.lastError = e.message || 'Cannot reach PHP API.';
                return false;
            }
        },

        register(account) {
            return this.request('/auth/register.php', {
                method: 'POST',
                body: JSON.stringify({
                    name: account.name,
                    email: account.email,
                    contact: account.contact,
                    location: account.location || '',
                    password: account.password
                })
            });
        },

        login(name, email, password) {
            return this.request('/auth/login.php', {
                method: 'POST',
                body: JSON.stringify({ name: name, email: email, password: password })
            });
        },

        adminLogin(email, password) {
            return this.request('/auth/admin-login.php', {
                method: 'POST',
                body: JSON.stringify({ email: email, password: password })
            });
        },

        logout() {
            return this.request('/auth/logout.php', { method: 'POST', body: '{}' });
        },

        me() {
            return this.request('/auth/me.php', { method: 'GET' });
        },

        getAdminUsers(search, role) {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (role) params.set('role', role);
            const query = params.toString();
            return this.request('/admin/users.php' + (query ? '?' + query : ''), { method: 'GET' });
        },

        getAdminReports(species, location, status) {
            const params = new URLSearchParams();
            if (species) params.set('species', species);
            if (location) params.set('location', location);
            if (status) params.set('status', status);
            const query = params.toString();
            return this.request('/admin/reports.php' + (query ? '?' + query : ''), { method: 'GET' });
        },

        updateAdminReportStatus(id, found) {
            const status = found ? 'Found' : 'Lost';
            return this.request('/admin/reports.php?id=' + encodeURIComponent(id), {
                method: 'PATCH',
                body: JSON.stringify({ returned: !!found, status: status })
            });
        },

        deleteAdminReport(id) {
            return this.request('/admin/reports.php?id=' + encodeURIComponent(id), {
                method: 'DELETE'
            });
        },

        getReports() {
            return this.request('/reports/index.php?_=' + Date.now(), {
                method: 'GET',
                cache: 'no-store'
            });
        },

        createReport(report) {
            return this.request('/reports/index.php', {
                method: 'POST',
                body: JSON.stringify(report)
            });
        },

        updateReport(id, report) {
            return this.request('/reports/single.php?id=' + encodeURIComponent(id), {
                method: 'PUT',
                body: JSON.stringify(report)
            });
        },

        deleteReport(id) {
            return this.request('/reports/single.php?id=' + encodeURIComponent(id), {
                method: 'DELETE'
            });
        }
    };

    global.PetFinderAPI = PetFinderAPI;

    document.addEventListener('DOMContentLoaded', function () {
        PetFinderAPI.init().catch(function () {
            PetFinderAPI.useBackend = false;
            PetFinderAPI.ready = false;
        });
    });
})(window);
