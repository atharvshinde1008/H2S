/* ═══════════════════════════════════════════════════════
   Alerts Feed Module
   Real-time alert cards, sorted by distance + time
   ═══════════════════════════════════════════════════════ */

const PulseAlerts = (function () {
  'use strict';

  const alerts = [];
  let alertCount = 0;

  const TYPE_CONFIG = {
    medical: { label: 'Medical Emergency', icon: '🏥', cssClass: 'medical' },
    fire: { label: 'Fire Emergency', icon: '🔥', cssClass: 'fire' },
    harassment: { label: 'Harassment / Threat', icon: '⚠️', cssClass: 'harassment' },
    accident: { label: 'Accident', icon: '🚗', cssClass: 'accident' },
    other: { label: 'Emergency', icon: '🚨', cssClass: '' },
  };

  function init() {
    PulseSocket.on('alert:nearby', onAlertReceived);
    PulseSocket.on('incident:created', onIncidentCreated);
    PulseSocket.on('incident:updated', onIncidentUpdated);
    PulseSocket.on('incidents:active_list', onActiveList);

    // Alert overlay buttons
    const respondBtn = document.getElementById('alert-overlay-respond');
    const dismissBtn = document.getElementById('alert-overlay-dismiss');

    if (respondBtn) respondBtn.addEventListener('click', respondToOverlay);
    if (dismissBtn) dismissBtn.addEventListener('click', dismissOverlay);
  }

  function onAlertReceived(alertData) {
    const user = PulseSocket.getUser();
    // Don't alert yourself
    if (user && alertData.incident.userId === user.id) return;

    // Show full-screen overlay
    showAlertOverlay(alertData);

    // Add to feed
    addAlertToFeed(alertData);
  }

  function onIncidentCreated(incident) {
    const user = PulseSocket.getUser();
    if (user && incident.userId === user.id) return;

    const loc = PulseLocation.getCurrentLocation();
    let distance = 0;
    if (loc) {
      distance = haversine(loc, incident.location);
    }

    addAlertToFeed({ incident, distance });
  }

  function onIncidentUpdated(incident) {
    const existing = alerts.find((a) => a.incident.id === incident.id);
    if (existing) {
      existing.incident = incident;
      renderAlerts();
    }
  }

  function onActiveList(incidents) {
    const user = PulseSocket.getUser();
    const loc = PulseLocation.getCurrentLocation();

    incidents.forEach((incident) => {
      if (user && incident.userId === user.id) return;
      const exists = alerts.find((a) => a.incident.id === incident.id);
      if (exists) return;

      let distance = 0;
      if (loc) {
        distance = haversine(loc, incident.location);
      }
      alerts.push({ incident, distance });
    });

    renderAlerts();
  }

  function addAlertToFeed(alertData) {
    // Avoid duplicates
    const existing = alerts.find((a) => a.incident.id === alertData.incident.id);
    if (existing) return;

    alerts.unshift(alertData);
    alertCount++;
    updateBadge();
    renderAlerts();

    // Vibrate & Beep
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    playBeep();
  }

  // ─── AUDIO ENGINE ───────────────────────────────────
  let audioCtx = null;
  function playBeep() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      
      function beep(timeOffset) {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + timeOffset); 
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + timeOffset + 0.1);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime + timeOffset);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + timeOffset + 0.1);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + timeOffset);
        osc.stop(audioCtx.currentTime + timeOffset + 0.15);
      }
      beep(0);
      beep(0.2); // double beep
    } catch(err) {
      console.warn("Audio play failed:", err);
    }
  }

  // ─── SEVERITY ENGINE ────────────────────────────────
  function calculateSeverity(inc, distance) {
    if (inc.status !== 'active') return 0;
    let score = 100;
    if (distance === 0) score += 50;
    else if (distance < 1) score += 40;
    else if (distance < 5) score += 20;
    else score -= Math.min(distance, 50);
    
    if (inc.type === 'medical' || inc.type === 'fire') score += 20;
    else if (inc.type === 'harassment') score += 15;
    
    const ageMins = (Date.now() - inc.createdAt) / 60000;
    if (ageMins < 1) score += 30;
    else if (ageMins < 5) score += 15;
    else score -= Math.min(ageMins, 40);
    
    return score;
  }

  // ─── Alert Overlay ────────────────────────────────

  let currentOverlayIncident = null;

  function showAlertOverlay(alertData) {
    currentOverlayIncident = alertData.incident;
    const config = TYPE_CONFIG[alertData.incident.type] || TYPE_CONFIG.other;

    const overlay = document.getElementById('alert-overlay');
    const icon = document.getElementById('alert-overlay-icon');
    const title = document.getElementById('alert-overlay-title');
    const distance = document.getElementById('alert-overlay-distance');
    const time = document.getElementById('alert-overlay-time');

    if (icon) icon.textContent = config.icon;
    if (title) title.textContent = config.label;
    if (distance) distance.textContent = alertData.distance > 0
      ? alertData.distance.toFixed(1) + ' km away'
      : 'Nearby';
    if (time) time.textContent = 'Just now';
    if (overlay) overlay.classList.add('show');
  }

  function respondToOverlay() {
    const incident = currentOverlayIncident;
    if (incident) {
      PulseSocket.emit('sos:respond', { incidentId: incident.id });
    }
    dismissOverlay();

    // Switch to map and show Navigation Assist
    if (incident) {
      const appModule = window.PulseApp;
      if (appModule && appModule.switchTab) {
        appModule.switchTab('map');
      }

      // Open the Responder Navigation Assist panel
      setTimeout(() => {
        if (window.PulseNavigate) {
          PulseNavigate.showForIncident(incident);
        }
      }, 400);
    }
  }

  function dismissOverlay() {
    const overlay = document.getElementById('alert-overlay');
    if (overlay) overlay.classList.remove('show');
    currentOverlayIncident = null;
  }

  // ─── Render Alerts Feed ───────────────────────────

  function renderAlerts() {
    const container = document.getElementById('alerts-list');
    if (!container) return;
    
    alerts.forEach(a => {
      a.severityScore = calculateSeverity(a.incident, a.distance);
    });

    // Update critical banner
    const maxAlert = alerts.reduce((max, a) => (a.severityScore > (max?.severityScore || 0) ? a : max), null);
    const banner = document.getElementById('critical-alert-banner');
    const bannerText = document.getElementById('critical-banner-text');
    
    if (maxAlert && maxAlert.severityScore > 0) {
      const typeStr = TYPE_CONFIG[maxAlert.incident.type]?.label || 'Emergency';
      const distStr = maxAlert.distance > 0 ? maxAlert.distance.toFixed(1) + ' km' : 'Nearby';
      if (bannerText) bannerText.textContent = `🚨 MOST CRITICAL ALERT: ${typeStr} ${distStr} away!`;
      if (banner) banner.classList.remove('hide');
    } else {
      if (banner) banner.classList.add('hide');
    }

    // Sort: severity first, then active/responding over resolved, then by time
    const sorted = [...alerts].sort((a, b) => {
      if (a.severityScore !== b.severityScore) return b.severityScore - a.severityScore;
      const statusOrder = { active: 0, responding: 1, resolved: 2 };
      const sa = statusOrder[a.incident.status] || 3;
      const sb = statusOrder[b.incident.status] || 3;
      if (sa !== sb) return sa - sb;
      return b.incident.createdAt - a.incident.createdAt;
    });

    if (sorted.length === 0) {
      container.innerHTML = `
        <div class="empty-alerts" id="empty-alerts">
          <div class="empty-alerts-icon">🛡️</div>
          <div class="empty-alerts-text">All Clear</div>
          <div class="empty-alerts-sub">No active alerts in your area</div>
        </div>`;
      return;
    }

    container.innerHTML = sorted.map((alertData) => {
      const inc = alertData.incident;
      const config = TYPE_CONFIG[inc.type] || TYPE_CONFIG.other;
      const timeAgo = getTimeAgo(inc.createdAt);
      const distStr = alertData.distance > 0 ? alertData.distance.toFixed(1) + ' km' : 'Nearby';

      const statusClass =
        inc.status === 'active' ? 'badge-active' :
        inc.status === 'responding' ? 'badge-responding' : 'badge-resolved';

      const isUrgent = inc.status === 'active' ? 'urgent' : '';

      return `
        <div class="alert-card ${isUrgent}" data-incident-id="${inc.id}">
          <div class="alert-card-header">
            <div class="alert-type">
              <div class="alert-type-icon ${config.cssClass}">${config.icon}</div>
              <span class="alert-type-label">${config.label}</span>
            </div>
            <span class="alert-time">🕒 ${timeAgo}</span>
          </div>
          <div class="alert-meta">
            <span class="alert-distance">📍 ${distStr}</span>
            <span class="alert-status-badge ${statusClass}">${inc.status.toUpperCase()}</span>
          </div>
          <div class="alert-card-actions">
            <button class="btn btn-view" onclick="PulseAlerts.viewOnMap('${inc.id}')">📍 View</button>
            ${inc.status !== 'resolved' ?
              `<button class="btn btn-respond" onclick="PulseAlerts.respondTo('${inc.id}')">🙋 Respond</button>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  function viewOnMap(incidentId) {
    if (window.PulseApp && window.PulseApp.switchTab) {
      window.PulseApp.switchTab('map');
    }
  }

  function respondTo(incidentId) {
    PulseSocket.emit('sos:respond', { incidentId });

    // Find the incident data from the alerts list
    const alertData = alerts.find(a => a.incident.id === incidentId);
    if (alertData) {
      // Switch to map and show navigation assist
      if (window.PulseApp && window.PulseApp.switchTab) {
        window.PulseApp.switchTab('map');
      }
      setTimeout(() => {
        if (window.PulseNavigate) {
          PulseNavigate.showForIncident(alertData.incident);
        }
      }, 400);
    }
  }

  function updateBadge() {
    const badge = document.getElementById('nav-alert-count');
    const headerBadge = document.getElementById('notification-badge');

    const activeCount = alerts.filter((a) => a.incident.status === 'active').length;

    if (badge) {
      badge.textContent = activeCount;
      badge.style.display = activeCount > 0 ? 'flex' : 'none';
    }

    if (headerBadge) {
      headerBadge.style.display = activeCount > 0 ? 'block' : 'none';
    }
  }

  // ─── Utilities ──────────────────────────────────────

  function getTimeAgo(timestamp) {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' hrs ago';
    return Math.floor(diff / 86400) + ' days ago';
  }

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
    viewOnMap,
    respondTo,
    renderAlerts,
  };
})();
