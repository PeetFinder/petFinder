(function () {
  const ADMIN_PAGES = {
    reports: { href: 'admin-reports.html', label: 'Lost Pet Reports', icon: 'LR' },
    users: { href: 'admin-users.html', label: 'Registered Users', icon: 'US' }
  };

  function isAdminPage() {
    return document.body && document.body.classList.contains('admin-panel-body');
  }

  function getAdminPageKey() {
    return document.body.getAttribute('data-admin-page') || 'reports';
  }

  function getAdminUser() {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || 'null');
    } catch (e) {
      return null;
    }
  }

  function getAdminInitials(name) {
    return (name || 'A').split(' ').map(function (s) { return s[0]; }).join('').slice(0, 2).toUpperCase();
  }

  function buildSidebarHtml(activeKey) {
    const user = getAdminUser();
    const menuLinks = Object.keys(ADMIN_PAGES).map(function (key) {
      const item = ADMIN_PAGES[key];
      const activeClass = key === activeKey ? ' active' : '';
      return `<a href="${item.href}" class="admin-sidebar-link${activeClass}">
        <span class="admin-link-icon">${item.icon}</span>
        <span>${item.label}</span>
      </a>`;
    }).join('');

    return `
      <aside class="admin-sidebar">
        <div class="admin-sidebar-top">
          <div class="admin-sidebar-brand">
            <div class="admin-sidebar-brand-row">
              <img src="LOGO.png" alt="" class="brand-logo" width="36" height="36">
              <span>PetFinder Admin</span>
            </div>
          </div>
          <div class="admin-sidebar-profile">
            <div class="admin-sidebar-avatar">${getAdminInitials(user && user.name)}</div>
            <div>
              <div class="fw-bold small">${(user && user.name) || 'Admin'}</div>
              <small>${(user && user.email) || 'eriane_admin@petfinder.com'}</small>
            </div>
          </div>
          <div class="admin-sidebar-menu-label">Menu</div>
          ${menuLinks}
        </div>
        <div class="admin-sidebar-footer">
          <button type="button" class="admin-sidebar-link admin-sidebar-logout-btn" id="adminSidebarLogoutBtn">
            <span class="admin-link-icon">OUT</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>`;
  }

  function wrapAdminLayout() {
    const container = document.querySelector('.admin-panel-body > .container.my-4');
    if (!container || document.getElementById('adminShell')) return;

    const parent = container.parentNode;
    if (!parent) return;

    const shell = document.createElement('div');
    shell.id = 'adminShell';
    shell.className = 'admin-shell';

    const main = document.createElement('div');
    main.className = 'admin-main';

    const sidebarHolder = document.createElement('div');
    sidebarHolder.innerHTML = buildSidebarHtml(getAdminPageKey()).trim();
    const sidebar = sidebarHolder.firstElementChild;

    parent.insertBefore(shell, container);
    if (sidebar) shell.appendChild(sidebar);
    main.appendChild(container);
    shell.appendChild(main);

    const logoutBtn = document.getElementById('adminSidebarLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        if (typeof logoutAdminSession === 'function') {
          logoutAdminSession();
        } else {
          sessionStorage.removeItem('petfinderLoggedIn');
          localStorage.removeItem('currentUser');
          window.location.href = 'admin-auth.html';
        }
      });
    }
  }

  function guardAdminAccess() {
    if (typeof isCurrentUserAdmin === 'function' && isCurrentUserAdmin()) return true;
    window.location.replace('admin-auth.html');
    return false;
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!isAdminPage()) return;
    if (!guardAdminAccess()) return;
    if (typeof ensureDefaultAdminAccount === 'function') ensureDefaultAdminAccount();
  });

  window.initAdminPanelLayout = function () {
    if (!isAdminPage()) return;
    if (!guardAdminAccess()) return;
    wrapAdminLayout();
  };
})();
