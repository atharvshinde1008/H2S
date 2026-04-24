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

  async function updateAddress(lat, lng) {
    try {
      // Free reverse geocoding from Nominatim (OpenStreetMap)
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' }
      });
      const data = await response.json();
      const address = data.display_name || 'Address found';
      const shortAddress = data.address.road || data.address.suburb || data.address.city || 'Address found';

      currentLocation.address = address;
      currentLocation.shortAddress = shortAddress;

      console.log('📍 Address found:', shortAddress);

      // Update UI if elements exist
      const statusDetail = document.querySelector('.status-detail');
      if (statusDetail) statusDetail.textContent = shortAddress;

    } catch (err) {
      console.warn('🧭 Reverse Geocoding failed:', err);
    }
  }

  function onPositionSuccess(position) {
    const { latitude, longitude, accuracy } = position.coords;

    // Smooth jumping: Ignore updates if accuracy is very poor (> 500m) and we already have a lock
    if (currentLocation && accuracy > 500) return;

    currentLocation = {
      lat: latitude,
      lng: longitude,
      accuracy: accuracy, // in meters
      timestamp: Date.now(),
      address: currentLocation ? currentLocation.address : 'Locating...',
      shortAddress: currentLocation ? currentLocation.shortAddress : 'Locating...'
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

    // Fetch address in background
    updateAddress(latitude, longitude);
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
    // Replay last known location immediately
    if (currentLocation) {
      callback(currentLocation);
    }
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
