/* ═══════════════════════════════════════════════════════
   Location Tracking Module
   Watches GPS, emits updates via Socket.IO
   ═══════════════════════════════════════════════════════ */

const PulseLocation = (function () {
  'use strict';

  let watchId = null;
  let currentLocation = null;
  let lastEmitTime = 0;
  const EMIT_INTERVAL = 5000; // 5 seconds
  const listeners = [];

  function start() {
    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      updateUI('Not supported');
      return;
    }

    updateUI('Acquiring...');

    watchId = navigator.geolocation.watchPosition(
      onPositionSuccess,
      onPositionError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
  }

  function onPositionSuccess(position) {
    currentLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };

    updateUI('Active');

    // Notify listeners
    listeners.forEach((cb) => cb(currentLocation));

    // Throttle socket emissions
    const now = Date.now();
    if (now - lastEmitTime >= EMIT_INTERVAL) {
      lastEmitTime = now;
      PulseSocket.emit('location:update', { location: currentLocation });
      PulseSocket.emit('nearby:count', { location: currentLocation });
    }
  }

  function onPositionError(error) {
    console.warn('📍 Location error:', error.message);
    switch (error.code) {
      case error.PERMISSION_DENIED:
        updateUI('Permission denied');
        break;
      case error.POSITION_UNAVAILABLE:
        updateUI('Unavailable');
        break;
      case error.TIMEOUT:
        updateUI('Timeout — retrying');
        break;
    }
  }

  function updateUI(status) {
    const el = document.getElementById('location-status');
    if (el) el.textContent = status;
  }

  function getCurrentLocation() {
    return currentLocation;
  }

  function onLocationUpdate(callback) {
    listeners.push(callback);
  }

  function stop() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  }

  // Request one-shot location (for immediate SOS)
  function getOnce() {
    return new Promise((resolve, reject) => {
      if (currentLocation) {
        resolve(currentLocation);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          currentLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          resolve(currentLocation);
        },
        reject,
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  return {
    start,
    stop,
    getCurrentLocation,
    getOnce,
    onLocationUpdate,
  };
})();
