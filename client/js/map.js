/* ═══════════════════════════════════════════════════════
   Crisis Map Module — Leaflet + OpenStreetMap
   Shows incidents, nearby users, own location
   ═══════════════════════════════════════════════════════ */

const PulseMap = (function () {
  'use strict';

  let map = null;
  let selfMarker = null;
  let isInitialized = false;
  const incidentMarkers = {};
  const userMarkers = {};

  const INCIDENT_ICONS = {
    medical: { emoji: '🏥', color: '#FF3B30', class: 'marker-medical' },
    fire: { emoji: '🔥', color: '#FF9500', class: 'marker-fire' },
    harassment: { emoji: '⚠️', color: '#AF52DE', class: 'marker-harassment' },
    accident: { emoji: '🚗', color: '#007AFF', class: 'marker-accident' },
    other: { emoji: '🚨', color: '#64748B', class: 'marker-other' },
  };

  // Dark map tile layer
  const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

  function init() {
    if (isInitialized) return;
    if (!document.getElementById('crisis-map')) return;

    // Default to a centroid (India) — will center on user location once available
    map = L.map('crisis-map', {
      center: [20.5937, 78.9629],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    isInitialized = true;

    // Listen for location updates to center map
    PulseLocation.onLocationUpdate((loc) => {
      updateSelfMarker(loc);
    });

    // Listen for socket events
    PulseSocket.on('incident:created', onIncidentCreated);
    PulseSocket.on('incident:updated', onIncidentUpdated);
    PulseSocket.on('incidents:active_list', onActiveIncidentsList);
    PulseSocket.on('location:peer_update', onPeerLocationUpdate);
    PulseSocket.on('locations:active_list', onActiveLocationsList);

    // Locate button
    const locateBtn = document.getElementById('map-locate-btn');
    if (locateBtn) {
      locateBtn.addEventListener('click', centerOnSelf);
    }
  }

  let facilitiesFetched = false;
  async function fetchNearbyFacilities(lat, lng) {
    if (facilitiesFetched || !map) return;
    facilitiesFetched = true;

    // 5km radius
    const radius = 5000;
    const overpassQuery = `[out:json];(node["amenity"="hospital"](around:${radius},${lat},${lng});node["amenity"="police"](around:${radius},${lat},${lng});node["amenity"="fire_station"](around:${radius},${lat},${lng}););out;`;

    try {
      const response = await fetch(`https://overpass-api.de/api/interpreter`, { method: 'POST', body: overpassQuery });
      const data = await response.json();

      data.elements.forEach(el => {
        const type = el.tags.amenity;
        const iconConf = type === 'hospital' ? { emoji: '🏥', cls: 'facility-hospital' } :
          type === 'police' ? { emoji: '🚔', cls: 'facility-police' } :
            { emoji: '🚒', cls: 'facility-fire' };

        const icon = L.divIcon({
          className: '',
          html: `<div class="marker-facility ${iconConf.cls}">${iconConf.emoji}</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        L.marker([el.lat, el.lon], { icon, zIndexOffset: -100 })
          .addTo(map)
          .bindPopup(`<div style="color:#0F172A;font-family:Inter,sans-serif;"><b>${iconConf.emoji} ${type.replace('_', ' ').toUpperCase()}</b><br>${el.tags.name || 'Facility'}</div>`);
      });
    } catch (err) {
      console.warn("Could not fetch nearby facilities:", err);
    }
  }

  let accuracyCircle = null;

  function updateSelfMarker(loc) {
    if (!map) return;
    console.log('📍 Map received location update:', loc);

    const pos = [loc.lat, loc.lng];

    // Accuracy Circle (Google Maps style)
    if (loc.accuracy) {
      if (accuracyCircle) {
        accuracyCircle.setLatLng(pos);
        accuracyCircle.setRadius(loc.accuracy);
      } else {
        accuracyCircle = L.circle(pos, {
          radius: loc.accuracy,
          weight: 1,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          className: 'accuracy-circle-pulsing'
        }).addTo(map);
      }
    }

    if (selfMarker) {
      selfMarker.setLatLng(pos);
    } else {
      const icon = L.divIcon({
        className: '',
        html: `
          <div class="marker-self-container">
            <div class="marker-self-dot"></div>
            <div class="marker-self-pulse"></div>
          </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      selfMarker = L.marker(pos, { icon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup('<b>📍 Your Location</b>');

      // Center map on first location with a nice animation
      map.flyTo(pos, 17, { duration: 1.5 });

      // Fetch nearby police, hospital, and fire stations
      fetchNearbyFacilities(loc.lat, loc.lng);
    }
  }

  function centerOnSelf() {
    const loc = PulseLocation.getCurrentLocation();
    if (loc && map) {
      map.flyTo([loc.lat, loc.lng], 16, { duration: 1 });
    }
  }

  function addIncidentMarker(incident) {
    if (!map) return;
    if (incidentMarkers[incident.id]) {
      // Update existing
      incidentMarkers[incident.id].setLatLng([incident.location.lat, incident.location.lng]);
      return;
    }

    const config = INCIDENT_ICONS[incident.type] || INCIDENT_ICONS.other;
    const isPulsing = incident.status === 'active' ? 'marker-pulse' : '';

    const icon = L.divIcon({
      className: '',
      html: `<div class="custom-marker ${config.class} ${isPulsing}">${config.emoji}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const timeStr = getTimeAgo(incident.createdAt);
    const statusBadge = incident.status === 'active'
      ? '<span style="color:#FF3B30;font-weight:700;">● ACTIVE</span>'
      : incident.status === 'responding'
        ? '<span style="color:#FF9500;font-weight:700;">● RESPONDING</span>'
        : '<span style="color:#34C759;font-weight:700;">● RESOLVED</span>';

    const marker = L.marker([incident.location.lat, incident.location.lng], { icon })
      .addTo(map)
      .bindPopup(`
        <div style="color:#0F172A;font-family:Inter,sans-serif;min-width:180px;">
          <div style="font-size:15px;font-weight:700;margin-bottom:4px;">${config.emoji} ${capitalize(incident.type)} Emergency</div>
          <div style="font-size:12px;margin-bottom:2px;">By: ${incident.userName}</div>
          <div style="font-size:12px;margin-bottom:2px;">⏱ ${timeStr}</div>
          <div style="font-size:12px;">${statusBadge}</div>
          <div style="font-size:12px;color:#64748B;margin-top:4px;">${incident.responders.length} responder(s)</div>
        </div>
      `);

    incidentMarkers[incident.id] = marker;
  }

  function removeIncidentMarker(incidentId) {
    if (incidentMarkers[incidentId]) {
      map.removeLayer(incidentMarkers[incidentId]);
      delete incidentMarkers[incidentId];
    }
  }

  function addUserMarker(userId, userName, location) {
    if (!map) return;
    const user = PulseSocket.getUser();
    if (user && userId === user.id) return; // Don't show self as peer

    if (userMarkers[userId]) {
      userMarkers[userId].setLatLng([location.lat, location.lng]);
      return;
    }

    const icon = L.divIcon({
      className: '',
      html: '<div class="custom-marker marker-user"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const marker = L.marker([location.lat, location.lng], { icon, zIndexOffset: 100 })
      .addTo(map)
      .bindPopup(`<div style="color:#0F172A;font-family:Inter,sans-serif;"><b>👤 ${userName}</b></div>`);

    userMarkers[userId] = marker;
  }

  // ─── Socket Event Handlers ──────────────────────────

  function onIncidentCreated(incident) {
    addIncidentMarker(incident);
  }

  function onIncidentUpdated(incident) {
    if (incident.status === 'resolved') {
      removeIncidentMarker(incident.id);
    } else {
      addIncidentMarker(incident);
    }
  }

  function onActiveIncidentsList(incidents) {
    incidents.forEach(addIncidentMarker);
  }

  function onPeerLocationUpdate(data) {
    addUserMarker(data.userId, data.userName, data.location);
  }

  function onActiveLocationsList(locations) {
    locations.forEach((loc) => {
      addUserMarker(loc.userId, loc.userName, loc.location);
    });
  }

  // ─── Utilities ──────────────────────────────────────

  function invalidateSize() {
    if (map) {
      setTimeout(() => map.invalidateSize(), 100);
    }
  }

  function getTimeAgo(timestamp) {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' hrs ago';
    return Math.floor(diff / 86400) + ' days ago';
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function getMap() {
    return map;
  }

  return {
    init,
    invalidateSize,
    centerOnSelf,
    addIncidentMarker,
    getMap,
  };
})();
