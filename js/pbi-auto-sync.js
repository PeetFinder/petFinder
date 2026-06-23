
(function () {
  const SYNC_KEY = 'petfinder-local-sync';
  const INTERVAL_MS = 5 * 60 * 1000;
  const SYNC_URL = '/petfinder/api/pbi/auto-sync.php?key=' + encodeURIComponent(SYNC_KEY);
  const STATUS_URL = '/petfinder/api/pbi/status.php';

  let lastSyncedAt = null;
  let lastRowCount = null;
  let running = false;

  function reloadPowerBiIframes() {
    document.querySelectorAll('iframe[title="petfinderfinalpbi"], iframe.pbi-embed-frame').forEach(function (frame) {
      const src = frame.getAttribute('src');
      if (!src) return;
      frame.setAttribute('src', src);
    });
  }

  function updateStatusBadge(data) {
    const badge = document.getElementById('pbiAutoSyncStatus');
    if (!badge) return;

    const db = data.database || data.excel || data.lastSync || {};
    const rows = db.rowCount || data.liveRowCount || 0;
    const time = db.syncedAt ? new Date(db.syncedAt).toLocaleString() : 'just now';
    badge.textContent = 'MySQL: ' + rows + ' reports · Last check: ' + time;
    badge.classList.remove('text-danger');
    badge.classList.add('text-success');
  }

  function runAutoSync() {
    if (running) return;
    running = true;

    fetch(SYNC_URL, { credentials: 'same-origin' })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (payload) {
        const data = payload.data || {};
        if (!payload.ok || !data.success) return;

        const db = data.database || data.excel || {};
        const syncedAt = db.syncedAt;
        const isNewSync = syncedAt && syncedAt !== lastSyncedAt;
        if (isNewSync) {
          lastSyncedAt = syncedAt;
          updateStatusBadge(data);
          window.dispatchEvent(new CustomEvent('petfinder-pbi-synced', { detail: data }));

          const pbi = data.powerBi || {};
          if (pbi.success && !pbi.skipped) {
            setTimeout(reloadPowerBiIframes, 8000);
          }
        }
      })
      .catch(function () { })
      .finally(function () {
        running = false;
      });
  }

  function loadLastStatus() {
    fetch(STATUS_URL, { credentials: 'same-origin', cache: 'no-store' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        const count = data.liveRowCount != null ? data.liveRowCount : null;
        if (count != null && lastRowCount !== null && count !== lastRowCount) {
          reloadPowerBiIframes();
        }
        if (count != null) {
          lastRowCount = count;
        }
        const last = data && data.lastSync;
        if (last && last.syncedAt) {
          lastSyncedAt = last.syncedAt;
          updateStatusBadge({ lastSync: last, liveRowCount: data.liveRowCount });
        } else if (data.liveRowCount != null) {
          updateStatusBadge({ liveRowCount: data.liveRowCount });
        }
      })
      .catch(function () { });
  }

  window.PetFinderPbiAutoSync = {
    runNow: runAutoSync,
    reloadFrames: reloadPowerBiIframes,
  };

  loadLastStatus();
  setTimeout(runAutoSync, 2500);
  setInterval(runAutoSync, INTERVAL_MS);
  setInterval(loadLastStatus, 30000);
})();
