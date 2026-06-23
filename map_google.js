

(function () {
  const CENTER = window.TANAUAN_CITY_CENTER || { lat: 14.0853, lng: 121.1528, label: 'Tanauan City, Batangas' };
  const DEFAULT_ZOOM = 12;
  const EMBED_BOUNDS = { north: 14.155, south: 14.035, west: 121.048, east: 121.158 };
  const MAP_CONTAINER_ID = 'googleMap';

  let map = null;
  let mapMode = null;
  let barangayMarkers = {};
  let incidentMarkers = {};
  let infoWindow = null;
  let mapReady = false;
  let pendingIncidentPins = null;

  function getBarangays() {
    return window.TANAUAN_BARANGAYS || {};
  }

  function getAliases() {
    return window.TANAUAN_PIN_ALIASES || {};
  }

  function resolveBarangayKey(locationKey) {
    if (!locationKey) return null;
    const barangays = getBarangays();
    if (barangays[locationKey]) return locationKey;
    if (getAliases()[locationKey]) return getAliases()[locationKey];
    return null;
  }

  function getCoordsForKey(locationKey) {
    const barangayKey = resolveBarangayKey(locationKey);
    if (barangayKey) {
      const b = getBarangays()[barangayKey];
      return { lat: b.lat, lng: b.lng, name: b.name };
    }
    return null;
  }

  function getApiKey() {
    return (window.PETFINDER_GOOGLE_MAPS_API_KEY || '').trim();
  }

  function loadStylesheet(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function loadExternalScript(src) {
    return new Promise(function (resolve, reject) {
      if (window.L) {
        resolve();
        return;
      }
      if (document.querySelector('script[src="' + src + '"]')) {
        const wait = setInterval(function () {
          if (window.L) {
            clearInterval(wait);
            resolve();
          }
        }, 50);
        setTimeout(function () {
          clearInterval(wait);
          if (window.L) resolve();
          else reject(new Error('Leaflet load timeout'));
        }, 8000);
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Failed to load Leaflet')); };
      document.head.appendChild(script);
    });
  }

  function getMapElement() {
    return document.getElementById(MAP_CONTAINER_ID);
  }

  function shortBarangayLabel(name) {
    return String(name || '')
      .replace(/^Poblacion Barangay\s*/i, 'Pob. ')
      .replace(/^Barangay\s*/i, 'Brgy. ')
      .replace('Montaña', 'Montaña');
  }

  function latLngToOverlayPercent(lat, lng) {
    const left = ((lng - EMBED_BOUNDS.west) / (EMBED_BOUNDS.east - EMBED_BOUNDS.west)) * 100;
    const top = ((EMBED_BOUNDS.north - lat) / (EMBED_BOUNDS.north - EMBED_BOUNDS.south)) * 100;
    return {
      left: Math.min(98, Math.max(2, left)),
      top: Math.min(98, Math.max(2, top))
    };
  }

  function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function buildIncidentPopupHtml(key, pin) {
    const coords = getCoordsForKey(key);
    const locationTitle = pin.title || (coords && coords.name) || key;
    return `
      <div class="google-map-popup">
        <div class="google-map-popup-title">${escapeHtml(pin.name || 'Unknown')}</div>
        <div><strong>Location:</strong> ${escapeHtml(locationTitle)}</div>
        ${pin.breed ? `<div><strong>Breed:</strong> ${escapeHtml(pin.breed)}</div>` : ''}
        <div class="google-map-popup-log">${escapeHtml(pin.log || pin.summary || '')}</div>
        <button type="button" class="google-map-popup-btn" onclick="selectMapPin('${escapeHtml(key)}')">View incident</button>
      </div>`;
  }

  function buildBarangayPopupHtml(key, barangay) {
    return `
      <div class="google-map-popup">
        <div class="google-map-popup-title">${escapeHtml(barangay.name)}</div>
        <div class="google-map-popup-sub">Barangay, Tanauan City, Batangas</div>
      </div>`;
  }

  function loadGoogleMapsScript() {
    return new Promise(function (resolve, reject) {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      const key = getApiKey();
      if (!key) {
        reject(new Error('No Google Maps API key'));
        return;
      }

      const callbackName = '__petfinderGoogleMapsCallback';
      window[callbackName] = function () {
        delete window[callbackName];
        resolve();
      };

      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) + '&callback=' + callbackName;
      script.async = true;
      script.defer = true;
      script.onerror = function () {
        reject(new Error('Failed to load Google Maps'));
      };
      document.head.appendChild(script);
    });
  }

  function createBarangayMarkerInteractive(key, barangay) {
    const marker = new google.maps.Marker({
      position: { lat: barangay.lat, lng: barangay.lng },
      map: map,
      title: barangay.name,
      label: {
        text: shortBarangayLabel(barangay.name),
        color: '#2f3e33',
        fontSize: '9px',
        fontWeight: '700'
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: '#6E8E76',
        fillOpacity: 0.95,
        strokeColor: '#ffffff',
        strokeWeight: 2
      },
      zIndex: 10
    });

    marker.addListener('click', function () {
      if (!infoWindow) infoWindow = new google.maps.InfoWindow();
      infoWindow.setContent(buildBarangayPopupHtml(key, barangay));
      infoWindow.open({ anchor: marker, map: map });
    });

    barangayMarkers[key] = marker;
  }

  function createIncidentMarkerInteractive(key, pin) {
    const coords = pin.lat && pin.lng
      ? { lat: pin.lat, lng: pin.lng }
      : getCoordsForKey(key);

    if (!coords) return;

    const marker = new google.maps.Marker({
      position: { lat: coords.lat, lng: coords.lng },
      map: map,
      title: (pin.name || 'Lost pet') + ' — ' + (pin.title || key),
      label: {
        text: (pin.species || pin.name || 'P').toString().charAt(0).toUpperCase(),
        fontSize: '11px',
        fontWeight: '700'
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 14,
        fillColor: '#E8836B',
        fillOpacity: 0.95,
        strokeColor: '#ffffff',
        strokeWeight: 2
      },
      zIndex: 100
    });

    marker.addListener('click', function () {
      if (!infoWindow) infoWindow = new google.maps.InfoWindow();
      infoWindow.setContent(buildIncidentPopupHtml(key, pin));
      infoWindow.open({ anchor: marker, map: map });
      try {
        if (typeof selectMapPin === 'function') selectMapPin(key);
      } catch (e) {}
    });

    incidentMarkers[key] = marker;
  }

  function drawAllBarangayMarkersInteractive() {
    const barangays = getBarangays();
    Object.keys(barangays).forEach(function (key) {
      if (!barangayMarkers[key]) {
        createBarangayMarkerInteractive(key, barangays[key]);
      }
    });
  }

  function initInteractiveGoogleMap() {
    const el = getMapElement();
    if (!el) return;

    el.innerHTML = '';
    el.classList.remove('google-map-embed-mode');

    map = new google.maps.Map(el, {
      center: { lat: CENTER.lat, lng: CENTER.lng },
      zoom: DEFAULT_ZOOM,
      mapTypeId: 'roadmap',
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
      restriction: {
        latLngBounds: {
          north: EMBED_BOUNDS.north,
          south: EMBED_BOUNDS.south,
          west: EMBED_BOUNDS.west,
          east: EMBED_BOUNDS.east
        },
        strictBounds: false
      }
    });

    infoWindow = new google.maps.InfoWindow();

    new google.maps.Marker({
      position: { lat: CENTER.lat, lng: CENTER.lng },
      map: map,
      title: CENTER.label,
      icon: {
        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 5,
        fillColor: '#1a73e8',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 1
      },
      zIndex: 5
    });

    drawAllBarangayMarkersInteractive();
    mapMode = 'interactive';
    mapReady = true;

    if (pendingIncidentPins) {
      updateIncidentMarkers(pendingIncidentPins);
      pendingIncidentPins = null;
    }
  }

  function createEmbedMarker(overlay, className, key, lat, lng, label, title, onClick) {
    const pos = latLngToOverlayPercent(lat, lng);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.style.left = pos.left + '%';
    btn.style.top = pos.top + '%';
    btn.title = title;
    btn.setAttribute('aria-label', title);
    if (label) {
      const span = document.createElement('span');
      span.className = className === 'google-barangay-pin' ? 'google-barangay-pin-label' : 'google-incident-pin-emoji';
      span.textContent = label;
      btn.appendChild(span);
    }
    btn.addEventListener('click', onClick);
    overlay.appendChild(btn);
    return btn;
  }

  function createIncidentMarkerLeaflet(key, pin) {
    const coords = pin.lat && pin.lng
      ? { lat: pin.lat, lng: pin.lng }
      : getCoordsForKey(key);
    if (!coords || !window.L || !map) return;

    const label = (pin.species || pin.name || 'P').toString().charAt(0).toUpperCase();
    const icon = L.divIcon({
      className: 'leaflet-incident-pin-icon',
      html: '<div class="google-incident-pin"><span class="google-incident-pin-emoji">' + escapeHtml(label) + '</span></div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const marker = L.marker([coords.lat, coords.lng], { icon: icon, zIndexOffset: 1000 }).addTo(map);
    marker.bindPopup(buildIncidentPopupHtml(key, pin));
    marker.on('click', function () {
      try {
        if (typeof selectMapPin === 'function') selectMapPin(key);
      } catch (e) {}
    });
    incidentMarkers[key] = marker;
  }

  function initLeafletFallbackMap() {
    const el = getMapElement();
    if (!el) return Promise.reject(new Error('No map element'));

    el.innerHTML = '';
    el.classList.remove('google-map-embed-mode');
    el.classList.add('google-map-leaflet-mode');

    loadStylesheet('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');

    return loadExternalScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js').then(function () {
      const wrap = document.createElement('div');
      wrap.className = 'google-map-leaflet-wrap';

      const mapDiv = document.createElement('div');
      mapDiv.className = 'google-map-leaflet-canvas';
      wrap.appendChild(mapDiv);

      const badge = document.createElement('div');
      badge.className = 'google-map-city-badge';
      badge.innerHTML = '<strong>Tanauan City, Batangas</strong><span>48 barangays marked on map</span>';
      wrap.appendChild(badge);

      el.appendChild(wrap);

      map = L.map(mapDiv, { zoomControl: true, scrollWheelZoom: true }).setView([CENTER.lat, CENTER.lng], DEFAULT_ZOOM);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      barangayMarkers = {};
      const barangays = getBarangays();
      Object.keys(barangays).forEach(function (key) {
        const b = barangays[key];
        const marker = L.circleMarker([b.lat, b.lng], {
          radius: 5,
          fillColor: '#6E8E76',
          color: '#ffffff',
          weight: 2,
          fillOpacity: 0.95
        }).addTo(map);
        marker.bindTooltip(shortBarangayLabel(b.name), { direction: 'top' });
        barangayMarkers[key] = marker;
      });

      mapMode = 'leaflet';
      mapReady = true;

      if (pendingIncidentPins) {
        updateIncidentMarkers(pendingIncidentPins);
        pendingIncidentPins = null;
      }

      setTimeout(function () {
        if (map && map.invalidateSize) map.invalidateSize();
      }, 150);
    });
  }

  function initEmbeddedGoogleMap() {
    const el = getMapElement();
    if (!el) return;

    el.innerHTML = '';
    el.classList.remove('google-map-leaflet-mode');
    el.classList.add('google-map-embed-mode');

    const wrap = document.createElement('div');
    wrap.className = 'google-map-embed-wrap';

    const iframe = document.createElement('iframe');
    iframe.className = 'google-map-embed-frame';
    iframe.setAttribute('loading', 'eager');
    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    iframe.setAttribute('allowfullscreen', '');
    iframe.src = 'https://maps.google.com/maps?q=' + encodeURIComponent('Tanauan City, Batangas, Philippines') + '&hl=en&z=12&output=embed';

    const overlay = document.createElement('div');
    overlay.className = 'google-map-marker-overlay';
    overlay.id = 'googleMapMarkerOverlay';

    const badge = document.createElement('div');
    badge.className = 'google-map-city-badge';
    badge.innerHTML = '<strong>Tanauan City, Batangas</strong><span>48 barangays marked on map</span>';

    wrap.appendChild(iframe);
    wrap.appendChild(overlay);
    wrap.appendChild(badge);
    el.appendChild(wrap);

    const barangays = getBarangays();
    Object.keys(barangays).forEach(function (key) {
      const b = barangays[key];
      createEmbedMarker(
        overlay,
        'google-barangay-pin',
        key,
        b.lat,
        b.lng,
        shortBarangayLabel(b.name),
        b.name,
        function () {
          overlay.querySelectorAll('.google-barangay-pin').forEach(function (pin) {
            pin.classList.remove('active');
          });
          this.classList.add('active');
        }
      );
    });

    mapMode = 'embed';
    mapReady = true;

    if (pendingIncidentPins) {
      updateIncidentMarkers(pendingIncidentPins);
      pendingIncidentPins = null;
    }
  }

  function clearIncidentMarkers() {
    if (mapMode === 'interactive') {
      Object.keys(incidentMarkers).forEach(function (key) {
        try {
          incidentMarkers[key].setMap(null);
        } catch (e) {}
      });
    } else if (mapMode === 'leaflet' && map) {
      Object.keys(incidentMarkers).forEach(function (key) {
        try {
          map.removeLayer(incidentMarkers[key]);
        } catch (e) {}
      });
    } else {
      const overlay = document.getElementById('googleMapMarkerOverlay');
      if (overlay) {
        overlay.querySelectorAll('.google-incident-pin').forEach(function (node) {
          node.remove();
        });
      }
    }
    incidentMarkers = {};
  }

  function updateIncidentMarkers(pins) {
    if (!pins || typeof pins !== 'object') return;

    if (!mapReady) {
      pendingIncidentPins = pins;
      return;
    }

    clearIncidentMarkers();

    Object.keys(pins).forEach(function (key) {
      const pin = pins[key];
      if (!pin) return;

      if (mapMode === 'interactive' && map) {
        createIncidentMarkerInteractive(key, pin);
        return;
      }

      if (mapMode === 'leaflet' && map) {
        createIncidentMarkerLeaflet(key, pin);
        return;
      }

      const coords = pin.lat && pin.lng
        ? { lat: pin.lat, lng: pin.lng }
        : getCoordsForKey(key);
      if (!coords) return;

      const overlay = document.getElementById('googleMapMarkerOverlay');
      if (!overlay) return;

      const marker = createEmbedMarker(
        overlay,
        'google-incident-pin',
        key,
        coords.lat,
        coords.lng,
        (pin.species || pin.name || 'P').toString().charAt(0).toUpperCase(),
        (pin.name || 'Lost pet') + ' — ' + (pin.title || key),
        function () {
          try {
            if (typeof selectMapPin === 'function') selectMapPin(key);
          } catch (e) {}
        }
      );
      incidentMarkers[key] = marker;
    });
  }

  function focusGoogleMapPin(locationKey) {
    if (!locationKey) return;

    const coords = getCoordsForKey(locationKey);
    const pin = (window.mapPinIncidents || {})[locationKey];
    const lat = (pin && pin.lat) || (coords && coords.lat);
    const lng = (pin && pin.lng) || (coords && coords.lng);

    if (mapMode === 'interactive' && map && typeof lat === 'number' && typeof lng === 'number') {
      map.panTo({ lat: lat, lng: lng });
      map.setZoom(15);

      if (incidentMarkers[locationKey]) {
        if (!infoWindow) infoWindow = new google.maps.InfoWindow();
        infoWindow.setContent(buildIncidentPopupHtml(locationKey, pin || {}));
        infoWindow.open({ anchor: incidentMarkers[locationKey], map: map });
      } else {
        const barangayKey = resolveBarangayKey(locationKey);
        if (barangayKey && barangayMarkers[barangayKey]) {
          if (!infoWindow) infoWindow = new google.maps.InfoWindow();
          const b = getBarangays()[barangayKey];
          infoWindow.setContent(buildBarangayPopupHtml(barangayKey, b));
          infoWindow.open({ anchor: barangayMarkers[barangayKey], map: map });
        }
      }
      return;
    }

    if (mapMode === 'leaflet' && map && typeof lat === 'number' && typeof lng === 'number') {
      map.setView([lat, lng], 15, { animate: true });
      if (incidentMarkers[locationKey] && incidentMarkers[locationKey].openPopup) {
        incidentMarkers[locationKey].openPopup();
      }
      return;
    }

    const overlay = document.getElementById('googleMapMarkerOverlay');
    if (!overlay || typeof lat !== 'number' || typeof lng !== 'number') return;

    overlay.querySelectorAll('.google-incident-pin, .google-barangay-pin').forEach(function (node) {
      node.classList.remove('active');
    });

    if (incidentMarkers[locationKey]) {
      incidentMarkers[locationKey].classList.add('active');
      incidentMarkers[locationKey].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }

  function ensureMapInitialized() {
    if (mapReady) return Promise.resolve();

    const key = getApiKey();
    if (key) {
      return loadGoogleMapsScript()
        .then(function () {
          initInteractiveGoogleMap();
        })
        .catch(function () {
          initEmbeddedGoogleMap();
        });
    }

    initEmbeddedGoogleMap();
    return Promise.resolve();
  }

  function resizeMap() {
    if (mapMode === 'interactive' && map && window.google) {
      google.maps.event.trigger(map, 'resize');
      map.setCenter({ lat: CENTER.lat, lng: CENTER.lng });
      return;
    }
    if (mapMode === 'leaflet' && map && map.invalidateSize) {
      map.invalidateSize();
      map.setView([CENTER.lat, CENTER.lng], DEFAULT_ZOOM);
    }
  }

  window.updateGoogleMapMarkers = function (pins) {
    return ensureMapInitialized().then(function () {
      updateIncidentMarkers(pins);
    });
  };

  window.focusGoogleMapPin = focusGoogleMapPin;

  window.__googleMapReady = function () {
    return ensureMapInitialized();
  };

  window.updateOSMMarkers = window.updateGoogleMapMarkers;
  window.focusOSMPin = window.focusGoogleMapPin;
  window.__osmReady = window.__googleMapReady;

  document.addEventListener('DOMContentLoaded', function () {
    if (!getMapElement()) return;

    ensureMapInitialized().then(function () {
      if (typeof window.mapPinIncidents === 'object') {
        updateIncidentMarkers(window.mapPinIncidents);
      }
    });

    const originalShowSection = window.showSection;
    if (typeof originalShowSection === 'function' && !window.__googleMapShowSectionWrapped) {
      window.showSection = function (sectionId) {
        originalShowSection(sectionId);
        if (sectionId === 'map-page') {
          setTimeout(resizeMap, 200);
          if (typeof window.mapPinIncidents === 'object') {
            updateIncidentMarkers(window.mapPinIncidents);
          }
        }
      };
      window.__googleMapShowSectionWrapped = true;
    }
  });
})();
