/* ═══════════════════════════════════════════════════════
   Responder Navigation Assist Module
   Route calculation, situation-specific instructions,
   and Leaflet route drawing for responders
   ═══════════════════════════════════════════════════════ */

const PulseNavigate = (function () {
  'use strict';

  let activeRoute = null;       // Leaflet polyline
  let targetIncident = null;    // Current incident being navigated to
  let routeLayer = null;        // Leaflet layer group for route elements

  // Situation-specific instruction sets
  const SITUATION_INSTRUCTIONS = {
    medical: {
      icon: '🏥',
      title: 'Medical Emergency',
      items: [
        { type: 'critical', icon: '🩹', text: 'Carry a <strong>first aid kit</strong> if available. Check nearby shops or pharmacies on the way.' },
        { type: 'info', icon: '💧', text: 'Bring <strong>water</strong> — the victim may be dehydrated or in shock.' },
        { type: 'warning', icon: '🧤', text: 'Wear <strong>gloves</strong> if possible. Avoid direct contact with blood or bodily fluids.' },
        { type: 'info', icon: '📞', text: 'Call <strong>112 / ambulance</strong> while en route if not already dispatched.' },
        { type: 'info', icon: '🫀', text: 'Be prepared to perform <strong>CPR</strong> or apply pressure to wounds.' },
      ],
    },
    fire: {
      icon: '🔥',
      title: 'Fire Emergency',
      items: [
        { type: 'critical', icon: '🧯', text: 'Grab a <strong>fire extinguisher</strong> if available nearby.' },
        { type: 'warning', icon: '💧', text: 'Carry <strong>water bottles</strong> or a wet towel to cover your face.' },
        { type: 'critical', icon: '🚫', text: '<strong>Do NOT enter</strong> a burning building. Help people evacuate from outside.' },
        { type: 'info', icon: '📞', text: 'Confirm <strong>fire department</strong> has been called (101 / 112).' },
        { type: 'warning', icon: '💨', text: 'Stay <strong>upwind</strong> from smoke. Cover nose and mouth.' },
      ],
    },
    harassment: {
      icon: '⚠️',
      title: 'Threat / Harassment',
      items: [
        { type: 'critical', icon: '📱', text: 'Start <strong>recording video</strong> as evidence when safe to do so.' },
        { type: 'warning', icon: '👥', text: 'Try to approach with <strong>another person</strong>. Do not go alone.' },
        { type: 'info', icon: '📞', text: 'Alert <strong>police (100 / 112)</strong> immediately if not already done.' },
        { type: 'warning', icon: '🔇', text: 'Approach <strong>calmly</strong>. Do not escalate the situation.' },
        { type: 'info', icon: '📍', text: 'Note the <strong>exact location</strong> and any identifying details of the aggressor.' },
      ],
    },
    accident: {
      icon: '🚗',
      title: 'Accident',
      items: [
        { type: 'critical', icon: '🩹', text: 'Bring a <strong>first aid kit</strong> — expect cuts, bruises, or fractures.' },
        { type: 'warning', icon: '🔺', text: 'Watch for <strong>hazards</strong>: broken glass, fuel leaks, live wires.' },
        { type: 'info', icon: '💧', text: 'Carry <strong>water</strong> and a <strong>blanket or towel</strong> for shock victims.' },
        { type: 'info', icon: '📞', text: 'Call <strong>ambulance (108 / 112)</strong> while heading to the scene.' },
        { type: 'critical', icon: '🚫', text: '<strong>Do NOT move</strong> the victim unless there is immediate danger (fire, explosion).' },
      ],
    },
    other: {
      icon: '🚨',
      title: 'Emergency',
      items: [
        { type: 'info', icon: '💧', text: 'Carry <strong>water</strong> and any available first aid supplies.' },
        { type: 'info', icon: '📞', text: 'Call <strong>emergency services (112)</strong> if not already done.' },
        { type: 'warning', icon: '⚡', text: 'Stay <strong>alert</strong> and assess the situation before approaching.' },
        { type: 'info', icon: '📍', text: 'Share your <strong>live location</strong> with someone you trust.' },
      ],
    },
  };

  function init() {
    // Close button for the assist panel
    const closeBtn = document.getElementById('assist-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closePanel);
    }

    // Acknowledge / Start navigation button
    const navBtn = document.getElementById('start-nav-btn');
    if (navBtn) {
      navBtn.addEventListener('click', onAcknowledge);
    }
  }

  /**
   * Opens the Navigation Assist panel for a specific incident.
   * Called when a responder clicks "I Can Help" from either the overlay or feed.
   */
  function showForIncident(incident) {
    if (!incident || !incident.location) return;

    targetIncident = incident;
    const responderLoc = PulseLocation.getCurrentLocation();
    if (!responderLoc) {
      console.warn('🧭 No responder location available');
      return;
    }

    // Calculate route info
    const distance = haversine(responderLoc, incident.location);
    const walkSpeed = 5; // km/h average walking speed
    const estimatedMinutes = Math.max(1, Math.round((distance / walkSpeed) * 60));

    // Get situation instructions
    const situation = SITUATION_INSTRUCTIONS[incident.type] || SITUATION_INSTRUCTIONS.other;

    // Update the panel UI
    updatePanelUI(incident, distance, estimatedMinutes, situation);

    // Draw route on map
    drawRoute(responderLoc, incident.location, incident.type);

    // Show the panel
    const panel = document.getElementById('responder-assist-panel');
    if (panel) {
      panel.classList.add('show');
    }
  }

  function updatePanelUI(incident, distance, minutes, situation) {
    // Route info
    const routeTime = document.getElementById('assist-route-time');
    if (routeTime) {
      const distStr = distance < 1
        ? Math.round(distance * 1000) + 'm'
        : distance.toFixed(1) + 'km';
      routeTime.textContent = `⏱️ ~${minutes} min (${distStr})`;
    }

    // Instructions container
    const instructionsContainer = document.querySelector('.assist-instructions');
    if (instructionsContainer) {
      instructionsContainer.innerHTML = situation.items.map(item => {
        const cssClass = item.type === 'critical' ? 'critical' :
                         item.type === 'warning' ? 'warning' : 'info';
        return `
          <div class="instruction-item ${cssClass}">
            <span class="inst-icon">${item.icon}</span>
            <p>${item.text}</p>
          </div>`;
      }).join('');
    }

    // Update panel title based on situation
    const assistIcon = document.querySelector('.assist-icon');
    const assistTitle = document.querySelector('.assist-title h3');
    if (assistIcon) assistIcon.textContent = situation.icon;
    if (assistTitle) assistTitle.textContent = `${situation.title} — Navigation`;

    // Update acknowledge button
    const navBtn = document.getElementById('start-nav-btn');
    if (navBtn) {
      navBtn.innerHTML = '🗺️ Open in Google Maps';
    }
  }

  function drawRoute(from, to, emergencyType) {
    // Get the map instance from PulseMap (we'll expose it)
    const map = PulseMap.getMap ? PulseMap.getMap() : null;
    if (!map) return;

    // Remove previous route
    clearRoute();

    // Route color based on emergency type
    const colors = {
      medical: '#FF3B30',
      fire: '#FF9500',
      harassment: '#AF52DE',
      accident: '#007AFF',
      other: '#64748B',
    };
    const routeColor = colors[emergencyType] || colors.other;

    // Create a route layer group
    routeLayer = L.layerGroup().addTo(map);

    // Create waypoints for a simulated route (adds slight curve for realism)
    const midLat = (from.lat + to.lat) / 2 + (Math.random() - 0.5) * 0.002;
    const midLng = (from.lng + to.lng) / 2 + (Math.random() - 0.5) * 0.002;

    const routePoints = [
      [from.lat, from.lng],
      [midLat, midLng],
      [to.lat, to.lng],
    ];

    // Draw the route line
    activeRoute = L.polyline(routePoints, {
      color: routeColor,
      weight: 4,
      opacity: 0.85,
      dashArray: '10, 8',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeLayer);

    // Add animated dash effect via CSS class
    const routeElement = activeRoute.getElement();
    if (routeElement) {
      routeElement.classList.add('route-animated');
    }

    // Add destination marker with pulsing effect
    const destIcon = L.divIcon({
      className: '',
      html: `<div class="route-destination-marker">🎯</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    L.marker([to.lat, to.lng], { icon: destIcon, zIndexOffset: 2000 })
      .addTo(routeLayer);

    // Add "You are here" label at start
    const startIcon = L.divIcon({
      className: '',
      html: `<div class="route-start-marker">📍 You</div>`,
      iconSize: [60, 24],
      iconAnchor: [30, 12],
    });

    L.marker([from.lat, from.lng], { icon: startIcon, zIndexOffset: 2000 })
      .addTo(routeLayer);

    // Fit map to show the full route
    const bounds = L.latLngBounds(routePoints);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
  }

  function clearRoute() {
    const map = PulseMap.getMap ? PulseMap.getMap() : null;
    if (map && routeLayer) {
      map.removeLayer(routeLayer);
      routeLayer = null;
      activeRoute = null;
    }
  }

  function closePanel() {
    const panel = document.getElementById('responder-assist-panel');
    if (panel) panel.classList.remove('show');
    clearRoute();
    targetIncident = null;
  }

  function onAcknowledge() {
    if (!targetIncident || !targetIncident.location) return;

    const responderLoc = PulseLocation.getCurrentLocation();

    // Open Google Maps for turn-by-turn navigation
    const dest = targetIncident.location;
    let mapsUrl;

    if (responderLoc) {
      mapsUrl = `https://www.google.com/maps/dir/${responderLoc.lat},${responderLoc.lng}/${dest.lat},${dest.lng}`;
    } else {
      mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=walking`;
    }

    window.open(mapsUrl, '_blank');
  }

  // ─── Utilities ──────────────────────────────────────

  function haversine(a, b) {
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function toRad(d) { return d * Math.PI / 180; }

  return {
    init,
    showForIncident,
    closePanel,
    clearRoute,
  };
})();
