
(function () {
  'use strict';

  var STATS_URL = 'api/pbi/stats.php';
  var lastTotalPets = null;
  var pollMs = 15000;

  function resolveStatsUrl() {
    if (window.petfinderUrl) {
      return window.petfinderUrl('api/pbi/stats.php');
    }
    return STATS_URL;
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function reloadPowerBiEmbed(force) {
    document.querySelectorAll('iframe[title="petfinderfinalpbi"], iframe.pbi-embed-frame').forEach(function (frame) {
      var src = frame.getAttribute('src') || '';
      if (!src) return;
      var base = src.split('&cb=')[0].split('?cb=')[0];
      if (force) {
        var sep = base.indexOf('?') >= 0 ? '&' : '?';
        frame.setAttribute('src', base + sep + 'cb=' + Date.now());
      } else {
        frame.setAttribute('src', base);
      }
    });
  }

  function updateReportsTable(reports) {
    var body = document.getElementById('pbiLiveReportsBody');
    if (!body) return;

    if (!reports || !reports.length) {
      body.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No reports yet. Submit a report on the website.</td></tr>';
      return;
    }

    body.innerHTML = reports.map(function (r) {
      var statusClass = r.status === 'Found' ? 'bg-success' : 'bg-warning text-dark';
      var date = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—';
      return '<tr>'
        + '<td class="fw-semibold">' + escapeHtml(r.name || '—') + '</td>'
        + '<td>' + escapeHtml(r.species || '—') + '</td>'
        + '<td>' + escapeHtml(r.breed || '—') + '</td>'
        + '<td><span class="badge ' + statusClass + '">' + escapeHtml(r.status || 'Lost') + '</span></td>'
        + '<td>' + escapeHtml(r.location || '—') + '</td>'
        + '<td class="text-muted small">' + date + '</td>'
        + '</tr>';
    }).join('');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function updateStatsUI(data) {
    setText('pbiStatTotal', data.totalPets);
    setText('pbiStatLost', data.lostPets);
    setText('pbiStatFound', data.foundPets);
    setText('pbiStatDogs', data.totalDogs);
    setText('pbiStatCats', data.totalCats);

    var note = document.getElementById('pbiLiveStatsNote');
    if (note) {
      var when = data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'just now';
      note.textContent = 'Live from MySQL (petfinder_db) · Last check: ' + when;
      if (data.powerBiNote) {
        note.textContent += ' · ' + data.powerBiNote;
      }
    }

    var badge = document.getElementById('pbiAutoSyncStatus');
    if (badge) {
      badge.textContent = 'MySQL: ' + data.totalPets + ' pets · Updated ' + (data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : '');
      badge.classList.remove('text-danger');
      badge.classList.add('text-success');
    }

    updateReportsTable(data.recentReports || []);
  }

  function fetchStats(reloadOnChange) {
    return fetch(resolveStatsUrl(), { credentials: 'same-origin', cache: 'no-store' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.success) return data;

        var total = data.totalPets;
        if (reloadOnChange && lastTotalPets !== null && total !== lastTotalPets) {
          reloadPowerBiEmbed(true);
        }
        lastTotalPets = total;
        updateStatsUI(data);
        window.dispatchEvent(new CustomEvent('petfinder-pbi-stats', { detail: data }));
        return data;
      })
      .catch(function () {
        var note = document.getElementById('pbiLiveStatsNote');
        if (note) {
          note.textContent = 'Could not load live stats. Start Apache + MySQL in XAMPP.';
          note.classList.add('text-danger');
        }
      });
  }

  function bindReloadButton() {
    var btn = document.getElementById('pbiReloadEmbedBtn');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function () {
      fetchStats(false).then(function () {
        reloadPowerBiEmbed(true);
      });
    });
  }

  window.PetFinderPbiLiveStats = {
    refreshNow: function () {
      return fetchStats(true);
    },
    reloadEmbed: reloadPowerBiEmbed,
  };

  window.addEventListener('petfinder-report-saved', function () {
    setTimeout(function () { fetchStats(true); }, 500);
  });

  document.addEventListener('DOMContentLoaded', function () {
    bindReloadButton();
    fetchStats(false);
    setInterval(function () { fetchStats(true); }, pollMs);
  });
})();
