/* ═══════════════════════════════════════════════════════
   Voice Activation Module — "Hey PulseNet, Emergency"
   Uses Web Speech API for hands-free SOS triggering
   ═══════════════════════════════════════════════════════ */

const PulseVoice = (function () {
  'use strict';

  let recognition = null;
  let isListening = false;
  let isEnabled = false;
  let restartTimeout = null;
  let cooldownActive = false;
  let pendingSOSTimeout = null; // Tracks the 2-second SOS countdown

  // Wake phrases (lowercased for matching)
  const WAKE_PHRASES = [
    'hey pulsenet emergency',
    'hey pulse net emergency',
    'hey pulsenet help',
    'hey pulse net help',
    'pulsenet emergency',
    'pulse net emergency',
    'pulsenet sos',
    'pulse net sos',
    'hey pulsenet',
    'hey pulse net',
    'emergency',
  ];

  // Phrases that also set a specific emergency type
  const TYPE_PHRASES = {
    medical: ['medical', 'doctor', 'ambulance', 'hospital', 'health', 'heart', 'bleeding', 'injury', 'hurt'],
    fire: ['fire', 'burning', 'smoke', 'flames'],
    harassment: ['threat', 'harass', 'attack', 'stalker', 'following', 'danger', 'assault'],
    accident: ['accident', 'crash', 'collision', 'car', 'vehicle', 'road'],
  };

  function init() {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('🎤 Speech Recognition not supported in this browser');
      hideVoiceUI();
      return;
    }

    // Load saved preference
    isEnabled = localStorage.getItem('pulsenet_voice') === 'true';

    // Setup toggle in settings
    const toggle = document.getElementById('toggle-voice');
    if (toggle) {
      toggle.checked = isEnabled;
      toggle.addEventListener('change', (e) => {
        isEnabled = e.target.checked;
        localStorage.setItem('pulsenet_voice', isEnabled);
        if (isEnabled) {
          startListening();
        } else {
          stopListening();
        }
        updateVoiceIndicator();
      });
    }

    // Setup recognition engine
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    recognition.onresult = onResult;
    recognition.onerror = onError;
    recognition.onend = onEnd;
    recognition.onstart = onStart;

    // Voice indicator click to toggle
    const indicator = document.getElementById('voice-indicator');
    if (indicator) {
      indicator.addEventListener('click', toggleVoice);
    }

    if (isEnabled) {
      startListening();
    }

    updateVoiceIndicator();
  }

  function startListening() {
    if (!recognition || isListening) return;

    try {
      recognition.start();
    } catch (err) {
      console.warn('🎤 Recognition start error:', err.message);
    }
  }

  function stopListening() {
    if (!recognition) return;
    clearTimeout(restartTimeout);
    try {
      recognition.stop();
    } catch (err) {
      // Already stopped
    }
    isListening = false;
    updateVoiceIndicator();
  }

  function toggleVoice() {
    isEnabled = !isEnabled;
    localStorage.setItem('pulsenet_voice', isEnabled);

    const toggle = document.getElementById('toggle-voice');
    if (toggle) toggle.checked = isEnabled;

    if (isEnabled) {
      startListening();
      showVoiceToast('Voice activation enabled');
    } else {
      stopListening();
      showVoiceToast('Voice activation disabled');
    }
    updateVoiceIndicator();
  }

  // ─── Recognition Event Handlers ──────────────────────

  function onStart() {
    isListening = true;
    updateVoiceIndicator();
    console.log('🎤 Voice recognition started');
  }

  function onResult(event) {
    if (cooldownActive) return;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];

      // Check all alternatives
      for (let j = 0; j < result.length; j++) {
        const transcript = result[j].transcript.toLowerCase().trim();
        console.log('🎤 Heard:', transcript);

        // Check if any wake phrase matches
        const matched = WAKE_PHRASES.some(phrase => transcript.includes(phrase));

        if (matched) {
          console.log('🎤 ✅ Wake phrase detected:', transcript);
          onWakeDetected(transcript);
          return;
        }
      }
    }
  }

  function onError(event) {
    console.warn('🎤 Recognition error:', event.error);

    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      isEnabled = false;
      localStorage.setItem('pulsenet_voice', 'false');
      const toggle = document.getElementById('toggle-voice');
      if (toggle) toggle.checked = false;
      updateVoiceIndicator();
      showVoiceToast('Microphone permission denied');
      return;
    }

    // Auto-restart on recoverable errors
    if (isEnabled && (event.error === 'no-speech' || event.error === 'aborted' || event.error === 'network')) {
      scheduleRestart();
    }
  }

  function onEnd() {
    isListening = false;
    updateVoiceIndicator();

    // Auto-restart if still enabled
    if (isEnabled) {
      scheduleRestart();
    }
  }

  function scheduleRestart() {
    clearTimeout(restartTimeout);
    restartTimeout = setTimeout(() => {
      if (isEnabled && !isListening) {
        startListening();
      }
    }, 1000);
  }

  // ─── Wake Phrase Handling ────────────────────────────

  function onWakeDetected(transcript) {
    // Prevent rapid re-triggers
    cooldownActive = true;
    setTimeout(() => { cooldownActive = false; }, 8000);

    // Flash the voice indicator
    flashVoiceIndicator();

    // Determine emergency type from transcript
    let detectedType = 'medical'; // default
    for (const [type, keywords] of Object.entries(TYPE_PHRASES)) {
      if (keywords.some(kw => transcript.includes(kw))) {
        detectedType = type;
        break;
      }
    }

    // Vibrate to confirm
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }

    // Play confirmation tone
    playConfirmTone();

    // Show voice activation overlay
    showVoiceActivationOverlay(detectedType);

    // Auto-trigger SOS after 2 second countdown (cancellable)
    clearTimeout(pendingSOSTimeout);
    pendingSOSTimeout = setTimeout(() => {
      triggerVoiceSOS(detectedType);
    }, 2000);
  }

  function triggerVoiceSOS(type) {
    console.log('🎤 🚨 Voice SOS firing for type:', type);

    // Hide the overlay first
    hideVoiceActivationOverlay();

    // Switch to home tab so user can see the SOS state
    if (window.PulseApp && window.PulseApp.switchTab) {
      // Force switch even if already on home by checking
      window.PulseApp.switchTab('home');
    }

    // Use PulseSOS's proper trigger method instead of duplicating logic
    // This ensures isEmergencyActive, activeIncident, socket events, and
    // all UI state are managed correctly through the same code path.
    if (window.PulseSOS && PulseSOS.triggerFromVoice) {
      PulseSOS.triggerFromVoice(type);
    } else {
      console.error('🎤 ❌ PulseSOS.triggerFromVoice not available');
      showVoiceToast('SOS trigger failed — try the button');
    }
  }

  // ─── Voice Activation Overlay ────────────────────────

  function showVoiceActivationOverlay(type) {
    const overlay = document.getElementById('voice-activation-overlay');
    if (!overlay) return;

    const TYPE_LABELS = {
      medical: '🏥 Medical Emergency',
      fire: '🔥 Fire Emergency',
      harassment: '⚠️ Threat / Harassment',
      accident: '🚗 Accident',
    };

    const typeLabel = overlay.querySelector('.voice-detected-type');
    if (typeLabel) typeLabel.textContent = TYPE_LABELS[type] || '🚨 Emergency';

    // Reset the countdown animation by removing and re-adding the fill element
    const bar = overlay.querySelector('.voice-countdown-bar');
    if (bar) {
      const oldFill = bar.querySelector('.voice-countdown-fill');
      if (oldFill) oldFill.remove();
      const newFill = document.createElement('div');
      newFill.className = 'voice-countdown-fill';
      bar.appendChild(newFill);
    }

    overlay.classList.add('show');

    // Cancel button — clears the pending SOS timeout
    const cancelBtn = overlay.querySelector('.voice-cancel-btn');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        clearTimeout(pendingSOSTimeout);
        pendingSOSTimeout = null;
        cooldownActive = false;
        hideVoiceActivationOverlay();
        showVoiceToast('Voice SOS cancelled');
      };
    }
  }

  function hideVoiceActivationOverlay() {
    const overlay = document.getElementById('voice-activation-overlay');
    if (overlay) overlay.classList.remove('show');
  }

  // ─── UI Updates ──────────────────────────────────────

  function updateVoiceIndicator() {
    const indicator = document.getElementById('voice-indicator');
    if (!indicator) return;

    indicator.classList.toggle('active', isEnabled && isListening);
    indicator.classList.toggle('disabled', !isEnabled);
    indicator.title = isEnabled
      ? (isListening ? 'Voice active — say "Hey PulseNet, Emergency"' : 'Voice connecting...')
      : 'Voice disabled — click to enable';
  }

  function flashVoiceIndicator() {
    const indicator = document.getElementById('voice-indicator');
    if (!indicator) return;

    indicator.classList.add('triggered');
    setTimeout(() => indicator.classList.remove('triggered'), 2000);
  }

  function showVoiceToast(message) {
    let toast = document.getElementById('voice-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'voice-toast';
      toast.className = 'voice-toast';
      document.body.appendChild(toast);
    }

    toast.textContent = '🎤 ' + message;
    toast.classList.remove('show');
    // Force reflow so the animation restarts
    void toast.offsetWidth;
    toast.classList.add('show');

    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function hideVoiceUI() {
    const indicator = document.getElementById('voice-indicator');
    if (indicator) indicator.style.display = 'none';

    const settingItem = document.getElementById('voice-setting-item');
    if (settingItem) settingItem.style.display = 'none';
  }

  // ─── Audio Feedback ──────────────────────────────────

  let audioCtx = null;
  function playConfirmTone() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      function tone(freq, time, dur) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + time);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime + time);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + time + dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + time);
        osc.stop(audioCtx.currentTime + time + dur + 0.05);
      }

      tone(523, 0, 0.15);     // C5
      tone(659, 0.15, 0.15);  // E5
      tone(784, 0.3, 0.25);   // G5
    } catch (err) {
      console.warn('Audio failed:', err);
    }
  }

  return {
    init,
    toggleVoice,
    isActive: () => isEnabled && isListening,
  };
})();
