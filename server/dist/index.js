"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const handler_1 = require("./sockets/handler");
const incidents_1 = __importDefault(require("./routes/incidents"));
const users_1 = __importDefault(require("./routes/users"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Socket.IO setup
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
// ─── Middleware ──────────────────────────────────────────
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ─── Test Route ──────────────────────────────────────────
app.get("/", (req, res) => {
    res.send("Backend is running 🚀");
});
// ─── API Routes ─────────────────────────────────────────
app.use("/api/incidents", incidents_1.default);
app.use("/api/users", users_1.default);
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
});
// ─── Socket Auth Middleware ─────────────────────────────
io.use((socket, next) => {
    const userId = socket.handshake.auth.userId;
    const userName = socket.handshake.auth.userName;
    if (!userId || !userName) {
        return next(new Error("Authentication required"));
    }
    socket.data.userId = userId;
    socket.data.userName = userName;
    next();
});
// ─── Socket Handlers ────────────────────────────────────
(0, handler_1.setupSocketHandlers)(io);
// ─── Start Server ───────────────────────────────────────
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
//# sourceMappingURL=index.js.map