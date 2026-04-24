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
  let pendingSOSTimeout = null;

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

  const TYPE_PHRASES = {
    medical: ['medical', 'doctor', 'ambulance', 'hospital', 'health', 'heart', 'bleeding', 'injury', 'hurt'],
    fire: ['fire', 'burning', 'smoke', 'flames'],
    harassment: ['threat', 'harass', 'attack', 'stalker', 'following', 'danger', 'assault'],
    accident: ['accident', 'crash', 'collision', 'car', 'vehicle', 'road'],
  };

  function init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('🎤 Speech Recognition not supported in this browser');
      hideVoiceUI();
      return;
    }

    isEnabled = localStorage.getItem('pulsenet_voice') === 'true';

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

    const indicator = document.getElementById('voice-indicator');
    if (indicator) {
      indicator.addEventListener('click', toggleVoice);
    }

    if (isEnabled) {
      startListening();
    }

    updateVoiceIndicator();
  }

  /**
   * (Re)initializes the SpeechRecognition object.
   * This is called on every start to ensure a fresh state, 
   * which fixes many 'no-speech' and 'aborted' issues.
   */
  function setupRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 3;

    rec.onresult = onResult;
    rec.onerror = onError;
    rec.onend = onEnd;
    rec.onstart = onStart;

    return rec;
  }

  function startListening() {
    if (!isEnabled || isListening) return;

    try {
      // Always create a fresh instance to avoid stale state
      recognition = setupRecognition();
      if (recognition) {
        recognition.start();
      }
    } catch (err) {
      console.warn('🎤 Recognition start error:', err.message);
      scheduleRestart(); // Try again later
    }
  }

  function stopListening() {
    clearTimeout(restartTimeout);
    if (!recognition) return;
    
    try {
      recognition.onend = null; // Prevent auto-restart loop
      recognition.stop();
    } catch (err) {}
    
    recognition = null;
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
    console.log('🎤 Voice recognition active');
  }

  function onResult(event) {
    if (cooldownActive) return;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      for (let j = 0; j < result.length; j++) {
        const transcript = result[j].transcript.toLowerCase().trim();
        
        // Debug: Log what's being heard
        if (result.isFinal) console.log('🎤 Heard (Final):', transcript);

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
      showVoiceToast('Microphone permission required');
      return;
    }

    // Recoverable errors: schedule a fresh restart
    if (isEnabled) {
      scheduleRestart();
    }
  }

  function onEnd() {
    isListening = false;
    updateVoiceIndicator();
    if (isEnabled) {
      scheduleRestart();
    }
  }

  function scheduleRestart() {
    clearTimeout(restartTimeout);
    // Short delay before restart to prevent tight loops
    restartTimeout = setTimeout(() => {
      if (isEnabled && !isListening) {
        startListening();
      }
    }, 1000);
  }

  // ─── Wake Phrase Handling ────────────────────────────

  function onWakeDetected(transcript) {
    cooldownActive = true;
    setTimeout(() => { cooldownActive = false; }, 8000);

    flashVoiceIndicator();

    let detectedType = 'medical';
    for (const [type, keywords] of Object.entries(TYPE_PHRASES)) {
      if (keywords.some(kw => transcript.includes(kw))) {
        detectedType = type;
        break;
      }
    }

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }

    playConfirmTone();
    showVoiceActivationOverlay(detectedType);

    clearTimeout(pendingSOSTimeout);
    pendingSOSTimeout = setTimeout(() => {
      triggerVoiceSOS(detectedType);
    }, 2000);
  }

  function triggerVoiceSOS(type) {
    hideVoiceActivationOverlay();
    if (window.PulseApp && window.PulseApp.switchTab) {
      window.PulseApp.switchTab('home');
    }
    if (window.PulseSOS && PulseSOS.triggerFromVoice) {
      PulseSOS.triggerFromVoice(type);
    } else {
      showVoiceToast('SOS trigger failed');
    }
  }

  // ─── UI Helpers (Toast, Overlay, etc.) ────────────────

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

    const bar = overlay.querySelector('.voice-countdown-bar');
    if (bar) {
      const oldFill = bar.querySelector('.voice-countdown-fill');
      if (oldFill) oldFill.remove();
      const newFill = document.createElement('div');
      newFill.className = 'voice-countdown-fill';
      bar.appendChild(newFill);
    }

    overlay.classList.add('show');

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

  function updateVoiceIndicator() {
    const indicator = document.getElementById('voice-indicator');
    if (!indicator) return;

    indicator.classList.toggle('active', isEnabled && isListening);
    indicator.classList.toggle('disabled', !isEnabled);
    indicator.title = isEnabled
      ? (isListening ? 'Voice active' : 'Connecting...')
      : 'Voice disabled';
  }

  function flashVoiceIndicator() {
    const indicator = document.getElementById('voice-indicator');
    if (indicator) {
      indicator.classList.add('triggered');
      setTimeout(() => indicator.classList.remove('triggered'), 2000);
    }
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
      tone(523, 0, 0.15); tone(659, 0.15, 0.15); tone(784, 0.3, 0.25);
    } catch (err) {}
  }

  return {
    init,
    toggleVoice,
    isActive: () => isEnabled && isListening,
  };
})();
