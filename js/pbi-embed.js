
(function () {
  'use strict';

  var EMBED_API = 'api/pbi/embed.php';
  var cachedEmbedUrl = '';

  function resolveEmbedApi() {
    if (window.petfinderUrl) {
      return window.petfinderUrl(EMBED_API);
    }
    return EMBED_API;
  }

  function stripCacheBust(url) {
    if (!url) return '';
    return url
      .replace(/([?&])cb=\d+/g, '$1')
      .replace(/([?&])t=\d+/g, '$1')
      .replace(/[?&]$/, '');
  }

  function withCacheBust(url) {
    var base = stripCacheBust(url);
    if (!base) return '';
    var sep = base.indexOf('?') >= 0 ? '&' : '?';
    return base + sep + 'cb=' + Date.now();
  }

  function getFrames() {
    return document.querySelectorAll('iframe[title="petfinderfinalpbi"], iframe.pbi-embed-frame');
  }

  function setLoading(active) {
    var loader = document.getElementById('pbiEmbedLoading');
    if (!loader) return;
    loader.style.display = active ? 'flex' : 'none';
  }

  function bindFrameLoad(frame) {
    if (!frame || frame.dataset.pbiLoadBound === '1') return;
    frame.dataset.pbiLoadBound = '1';
    frame.addEventListener('load', function () {
      if ((frame.getAttribute('src') || '') === 'about:blank') return;
      setLoading(false);
    });
  }

  function applyEmbedUrl(url, bustCache) {
    if (!url) return;
    cachedEmbedUrl = stripCacheBust(url);
    var freshUrl = bustCache ? withCacheBust(cachedEmbedUrl) : cachedEmbedUrl;

    document.querySelectorAll('a[data-pbi-embed-link]').forEach(function (link) {
      link.setAttribute('href', cachedEmbedUrl);
    });

    getFrames().forEach(function (frame) {
      if (frame.getAttribute('data-embed-locked') === '1') return;
      bindFrameLoad(frame);
      setLoading(true);
      if (bustCache) {
        frame.setAttribute('src', 'about:blank');
        window.setTimeout(function () {
          frame.setAttribute('src', freshUrl);
        }, 50);
      } else {
        frame.setAttribute('src', freshUrl);
      }
    });
  }

  function reloadEmbed() {
    if (cachedEmbedUrl) {
      applyEmbedUrl(cachedEmbedUrl, true);
      return Promise.resolve({ success: true, embedUrl: cachedEmbedUrl });
    }
    return loadEmbedUrl(true);
  }

  function loadEmbedUrl(forceRefresh) {
    return fetch(resolveEmbedApi(), { credentials: 'same-origin', cache: 'no-store' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.success && data.embedUrl) {
          applyEmbedUrl(data.embedUrl, forceRefresh !== false);
        } else {
          setLoading(false);
        }
        return data;
      })
      .catch(function () {
        setLoading(false);
      });
  }

  function bindReloadButton() {
    var btn = document.getElementById('pbiReloadEmbedBtn');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function () {
      btn.disabled = true;
      reloadEmbed().finally(function () {
        btn.disabled = false;
      });
    });
  }

  window.PetFinderPbiEmbed = {
    reload: reloadEmbed,
    setUrl: function (url) { applyEmbedUrl(url, true); },
  };

  function init() {
    getFrames().forEach(bindFrameLoad);
    bindReloadButton();
    loadEmbedUrl(true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
