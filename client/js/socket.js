/* ═══════════════════════════════════════════════════════
   Socket.IO Client Wrapper
   Manages connection, auth, reconnection, and events
   ═══════════════════════════════════════════════════════ */

const PulseSocket = (function () {
  'use strict';

  let socket = null;
  let isConnected = false;
  const eventListeners = {};

  function getUser() {
    const raw = localStorage.getItem('pulsenet_user');
    return raw ? JSON.parse(raw) : null;
  }

  function connect() {
    const user = getUser();
    if (!user) {
      console.error('❌ No user found — cannot connect socket');
      return;
    }

    socket = io({
      auth: {
        userId: user.id,
        userName: user.displayName,
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      isConnected = true;
      updateConnectionUI('connected');
      emit('incidents:get_active');
      emit('locations:get_active');
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      isConnected = false;
      updateConnectionUI('disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('🔌 Connection error:', err.message);
      updateConnectionUI('disconnected');
    });

    socket.io.on('reconnect_attempt', () => {
      updateConnectionUI('connecting');
    });

    socket.io.on('reconnect', () => {
      console.log('🔌 Reconnected!');
      isConnected = true;
      updateConnectionUI('connected');
    });

    // Forward all custom events to registered listeners
    const events = [
      'sos:confirmed',
      'sos:cancelled',
      'sos:responder_joined',
      'alert:nearby',
      'incident:created',
      'incident:updated',
      'incidents:active_list',
      'incidents:all_list',
      'location:peer_update',
      'locations:active_list',
      'nearby:count_result',
    ];

    events.forEach((event) => {
      socket.on(event, (data) => {
        fireEvent(event, data);
      });
    });
  }

  function emit(event, data) {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('⚠️ Socket not connected, queuing:', event);
      // Simple retry after reconnect
      const checkInterval = setInterval(() => {
        if (socket && isConnected) {
          socket.emit(event, data);
          clearInterval(checkInterval);
        }
      }, 1000);
      // Stop trying after 10s
      setTimeout(() => clearInterval(checkInterval), 10000);
    }
  }

  function on(event, callback) {
    if (!eventListeners[event]) {
      eventListeners[event] = [];
    }
    eventListeners[event].push(callback);
  }

  function off(event, callback) {
    if (eventListeners[event]) {
      eventListeners[event] = eventListeners[event].filter((cb) => cb !== callback);
    }
  }

  function fireEvent(event, data) {
    if (eventListeners[event]) {
      eventListeners[event].forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in ${event} handler:`, err);
        }
      });
    }
  }

  function updateConnectionUI(state) {
    const dot = document.getElementById('connection-dot');
    if (!dot) return;

    dot.className = 'connection-dot ' + state;
    dot.title =
      state === 'connected' ? 'Connected' :
      state === 'connecting' ? 'Reconnecting...' :
      'Disconnected';
  }

  function getConnectionState() {
    return isConnected;
  }

  function disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
      isConnected = false;
    }
  }

  return {
    connect,
    emit,
    on,
    off,
    disconnect,
    getConnectionState,
    getUser,
  };
})();
