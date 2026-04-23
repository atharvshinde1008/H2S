const BACKEND_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://pulsenet-s7tn.onrender.com";

const socket = io(BACKEND_URL, {
  transports: ["websocket"],
  reconnectionAttempts: 5,
});