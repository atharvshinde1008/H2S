/* ═══════════════════════════════════════════════════════
   SOS Module — Long-press trigger, emergency lifecycle
   ═══════════════════════════════════════════════════════ */

const PulseSOS = (function () {
  'use strict';

  let selectedType = 'medical';
  let isEmergencyActive = false;
  let activeIncident = null;
  let pressTimer = null;
  let pressStartTime = 0;
  let progressRAF = null;

  const HOLD_DURATION = 2000; // 2 seconds

  const TYPE_ICONS = {
    medical: '🏥',
    fire: '🔥',
    harassment: '⚠️',
    accident: '🚗',
    other: '🚨',
  };

  function init() {
    const typeButtons = document.querySelectorAll('.sos-type-btn');
    const sosContainer = document.getElementById('sos-container');
    const pulseRings = document.querySelectorAll('.sos-pulse-ring');
    
    typeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        typeButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedType = btn.dataset.type;
        
        // Update SOS container colors dynamically
        if (sosContainer) {
          sosContainer.setAttribute('data-current-type', selectedType);
        }
      });
    });

    // SOS Button — long press using unified Pointer Events
    const sosBtn = document.getElementById('sos-button');
    if (sosBtn) {
      sosBtn.addEventListener('pointerdown', onPressStart);
      sosBtn.addEventListener('pointerup', onPressEnd);
      sosBtn.addEventListener('pointerleave', onPressEnd);
      sosBtn.addEventListener('pointercancel', onPressEnd);
    }
    if (sosContainer) {
      sosContainer.setAttribute('data-current-type', selectedType); // init
    }

    // Cancel SOS button
    const cancelBtn = document.getElementById('cancel-sos-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', cancelSOS);
    }

    // Quick actions
    const callPolice = document.getElementById('btn-call-police');
    if (callPolice) {
      callPolice.addEventListener('click', () => {
        window.location.href = 'tel:112';
      });
    }

    const callFamily = document.getElementById('btn-call-family');
    if (callFamily) {
      callFamily.addEventListener('click', () => {
        const user = PulseSocket.getUser();
        if (user) {
          // Check for saved emergency contacts
          const contacts = JSON.parse(localStorage.getItem('pulsenet_contacts') || '[]');
          if (contacts.length > 0 && contacts[0].phone) {
            window.location.href = 'tel:' + contacts[0].phone;
          } else {
            alert('No emergency contacts saved. Add them in Profile → Emergency Contacts.');
          }
        }
      });
    }

    // Listen for socket events
    PulseSocket.on('sos:confirmed', onSOSConfirmed);
    PulseSocket.on('sos:cancelled', onSOSCancelled);
    PulseSocket.on('sos:responder_joined', onResponderJoined);
    PulseSocket.on('nearby:count_result', onNearbyCount);
  }

  // ─── Long-Press Handling ────────────────────────────

  function onPressStart(e) {
    if (isEmergencyActive) return;

    pressStartTime = Date.now();
    const circle = document.getElementById('sos-progress-circle');
    const hint = document.getElementById('sos-hint');

    if (hint) hint.textContent = 'Keep holding...';

    // Animate progress ring
    const circumference = 2 * Math.PI * 90; // r=90
    if (circle) {
      circle.style.strokeDasharray = circumference;
      circle.style.strokeDashoffset = circumference;
    }

    progressRAF = requestAnimationFrame(function animate() {
      const elapsed = Date.now() - pressStartTime;
      const progress = Math.min(elapsed / HOLD_DURATION, 1);

      if (circle) {
        circle.style.strokeDashoffset = circumference * (1 - progress);
      }

      if (progress < 1) {
        progressRAF = requestAnimationFrame(animate);
      }
    });

    pressTimer = setTimeout(triggerSOS, HOLD_DURATION);
  }

  function onPressEnd(e) {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    if (progressRAF) {
      cancelAnimationFrame(progressRAF);
      progressRAF = null;
    }

    // Reset progress ring
    const circle = document.getElementById('sos-progress-circle');
    const hint = document.getElementById('sos-hint');
    if (circle) {
      circle.style.strokeDashoffset = 2 * Math.PI * 90;
    }
    if (hint && !isEmergencyActive) {
      hint.textContent = 'Hold for 2 seconds to trigger emergency';
    }
  }

  // ─── SOS Trigger ──────────────────────────────────

  async function triggerSOS() {
    if (isEmergencyActive) return;

    try {
      const location = await PulseLocation.getOnce();

      // Vibrate if available
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }

      PulseSocket.emit('sos:trigger', {
        type: selectedType,
        location: location,
      });

      // Optimistic UI update
      showEmergencyState();

    } catch (err) {
      console.error('❌ Failed to get location for SOS:', err);
      alert('Could not get your location. Please enable GPS and try again.');
    }
  }

  function cancelSOS() {
    if (!activeIncident) return;

    PulseSocket.emit('sos:cancel', { incidentId: activeIncident.id });
  }

  // ─── UI State Management ──────────────────────────

  function showEmergencyState() {
    isEmergencyActive = true;

    const normal = document.getElementById('sos-normal');
    const active = document.getElementById('emergency-active');
    const icon = document.getElementById('emergency-type-icon');
    const statusDot = document.getElementById('status-dot');
    const statusLabel = document.getElementById('status-label');
    const statusDetail = document.getElementById('status-detail');

    if (normal) normal.classList.add('hide');
    if (active) active.classList.add('show');
    if (icon) icon.textContent = TYPE_ICONS[selectedType] || '🚨';
    if (statusDot) {
      statusDot.classList.remove('safe');
      statusDot.classList.add('danger');
    }
    if (statusLabel) statusLabel.textContent = 'EMERGENCY ACTIVE';
    if (statusDetail) statusDetail.textContent = 'SOS sent — awaiting responders';

    // Clear responders list
    const list = document.getElementById('responders-list');
    if (list) {
      list.innerHTML = '<li style="color: var(--text-muted); font-style: italic;">Waiting for responders...</li>';
    }
  }

  function hideEmergencyState() {
    isEmergencyActive = false;
    
    // Check if we had responders to rate
    const respondersList = document.getElementById('responders-list');
    if (activeIncident && respondersList && respondersList.children.length > 0 && !respondersList.innerHTML.includes('Waiting for responders')) {
      const rating = prompt('Your emergency has ended. Please rate your responder(s) out of 5 stars:');
      if (rating) {
        alert('Thank you for rating your responder! This helps keep PulseNet safe and reliable.');
      }
    }
    
    activeIncident = null;

    const normal = document.getElementById('sos-normal');
    const active = document.getElementById('emergency-active');
    const statusDot = document.getElementById('status-dot');
    const statusLabel = document.getElementById('status-label');
    const statusDetail = document.getElementById('status-detail');

    if (normal) normal.classList.remove('hide');
    if (active) active.classList.remove('show');
    if (statusDot) {
      statusDot.classList.remove('danger');
      statusDot.classList.add('safe');
    }
    if (statusLabel) statusLabel.textContent = "You're Safe";
    if (statusDetail) statusDetail.textContent = 'No active emergencies nearby';
  }

  // ─── Socket Event Handlers ────────────────────────

  function onSOSConfirmed(incident) {
    console.log('✅ SOS confirmed:', incident.id);
    activeIncident = incident;
  }

  function onSOSCancelled(incident) {
    console.log('❌ SOS cancelled:', incident.id);
    hideEmergencyState();
  }

  function onResponderJoined(data) {
    console.log('🙋 Responder joined:', data.responder.userName);
    const list = document.getElementById('responders-list');
    if (list) {
      // Remove "waiting" message
      const waiting = list.querySelector('li[style]');
      if (waiting && waiting.textContent.includes('Waiting')) {
        waiting.remove();
      }

      const li = document.createElement('li');
      // Mock ratings since backend payload doesn't send it fully yet
      const trustScore = (Math.random() * (5.0 - 4.5) + 4.5).toFixed(1);
      li.innerHTML = `<span>🙋</span> ${data.responder.userName} <span class="responder-rating">⭐️ ${trustScore}</span>`;
      list.appendChild(li);
    }

    // Vibrate
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }

  function onNearbyCount(data) {
    const el = document.getElementById('nearby-count');
    if (el) el.textContent = data.count;
  }

  // Public API
  function getActiveIncident() {
    return activeIncident;
  }

  function isActive() {
    return isEmergencyActive;
  }

  /**
   * Trigger SOS programmatically (e.g. from voice activation).
   * Sets the emergency type, updates UI selectors, then fires
   * through the same path as the long-press trigger.
   */
  function triggerFromVoice(type) {
    if (isEmergencyActive) return;

    // Update selected type + UI
    selectedType = type || 'medical';

    const typeButtons = document.querySelectorAll('.sos-type-btn');
    typeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === selectedType);
    });

    const sosContainer = document.getElementById('sos-container');
    if (sosContainer) {
      sosContainer.setAttribute('data-current-type', selectedType);
    }

    // Trigger through the standard path
    triggerSOS();
  }

  return {
    init,
    getActiveIncident,
    isActive,
    triggerFromVoice,
  };
})();
