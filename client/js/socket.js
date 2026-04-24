/* ═══════════════════════════════════════════════════════
   Socket Module — Handles real-time communication
   ═══════════════════════════════════════════════════════ */

const PulseSocket = (function () {
  'use strict';

  const BACKEND_URL =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:3000"
      : "https://pulsenet-s7tn.onrender.com";

  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('pulsenet_user'));

  // Initialize socket with authentication data
  const socket = io(BACKEND_URL, {
    transports: ["websocket"],
    reconnectionAttempts: 5,
    auth: {
      userId: user?.id,
      userName: user?.displayName
    }
  });

  socket.on("connect", () => {
    console.log("🔌 Connected to PulseNet backend:", socket.id);
    updateConnectionUI(true);
  });

  socket.on("connect_error", (err) => {
    console.error("❌ Connection error:", err.message);
    updateConnectionUI(false);
  });

  socket.on("disconnect", () => {
    console.warn("🔌 Disconnected from backend");
    updateConnectionUI(false);
  });

  function updateConnectionUI(isConnected) {
    const dot = document.getElementById('connection-dot');
    if (dot) {
      dot.className = 'connection-dot ' + (isConnected ? 'online' : 'offline');
      dot.title = isConnected ? 'Connected' : 'Disconnected / Reconnecting...';
    }
  }

  return {
    socket, // Direct access if needed
    
    /**
     * Get the current authenticated user data.
     */
    getUser: () => {
      return JSON.parse(localStorage.getItem('pulsenet_user'));
    },

    /**
     * Listen for events from the server.
     */
    on: (event, callback) => {
      socket.on(event, callback);
    },

    /**
     * Emit events to the server.
     */
    emit: (event, data) => {
      socket.emit(event, data);
    },

    /**
     * Disconnect the socket.
     */
    disconnect: () => {
      socket.disconnect();
    },

    /**
     * Manually trigger connection.
     */
    connect: () => {
      socket.connect();
    }
  };
})();

// Expose globally
window.PulseSocket = PulseSocket;