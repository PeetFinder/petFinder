/**
 * Background Excel + Power BI sync. Runs on page load and every few minutes.
 */
(function () {
  const SYNC_KEY = 'petfinder-local-sync';
  const INTERVAL_MS = 5 * 60 * 1000;
  const SYNC_URL = '/petfinder/api/pbi/auto-sync.php?key=' + encodeURIComponent(SYNC_KEY);
  const STATUS_URL = '/petfinder/api/pbi/status.php';

  let lastSyncedAt = null;
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
    if (!badge || !data || !data.excel) return;

    const rows = data.excel.rowCount || 0;
    const time = data.excel.syncedAt ? new Date(data.excel.syncedAt).toLocaleString() : 'just now';
    badge.textContent = 'Last sync: ' + time + ' · ' + rows + ' rows';
    badge.classList.remove('text-danger');
    badge.classList.add('text-success');

    if (data.excel.excelLocked) {
      badge.classList.remove('text-success');
      badge.classList.add('text-danger');
      badge.textContent += ' (Excel file was open — close it and sync again)';
    }
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

        const syncedAt = data.excel && data.excel.syncedAt;
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
    fetch(STATUS_URL, { credentials: 'same-origin' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        const last = data && data.lastSync;
        if (last && last.syncedAt) {
          lastSyncedAt = last.syncedAt;
          updateStatusBadge({ excel: last });
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
})();
