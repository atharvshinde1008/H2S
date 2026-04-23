/* ═══════════════════════════════════════════════════════
   App Initialization — Wires everything together
   ═══════════════════════════════════════════════════════ */

const PulseApp = (function () {
  'use strict';

  let currentTab = 'home';

  function init() {
    // Auth check
    const user = PulseSocket.getUser();
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    // Initialize all modules
    PulseSocket.connect();
    PulseLocation.start();
    PulseMap.init();
    PulseNavigate.init();
    PulseSOS.init();
    PulseAlerts.init();
    PulseProfile.init();
    PulseVoice.init();

    // Setup navigation
    setupNavigation();

    // Header buttons
    document.getElementById('btn-notifications')?.addEventListener('click', () => switchTab('alerts'));
    document.getElementById('btn-profile')?.addEventListener('click', () => switchTab('profile'));

    console.log('🚨 PulseNet initialized for:', user.displayName);
  }

  function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach((item) => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        switchTab(tab);
      });
    });
  }

  function switchTab(tab) {
    if (tab === currentTab) return;

    // Update nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((item) => {
      item.classList.toggle('active', item.dataset.tab === tab);
    });

    // Update screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach((screen) => {
      screen.classList.toggle('active', screen.dataset.screen === tab);
    });

    currentTab = tab;

    // Special handling
    if (tab === 'map') {
      PulseMap.invalidateSize();
    }
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    switchTab,
  };
})();

// Expose globally for inline onclick handlers
window.PulseApp = PulseApp;
window.PulseAlerts = PulseAlerts;
window.PulseProfile = PulseProfile;
window.PulseNavigate = PulseNavigate;
window.PulseVoice = PulseVoice;
window.PulseSOS = PulseSOS;
