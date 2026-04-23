import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { setupSocketHandlers } from './sockets/handler';
import incidentRoutes from './routes/incidents';
import userRoutes from './routes/users';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ─── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve static client files
app.use(express.static(path.join(__dirname, '../../client')));

// ─── API Routes ─────────────────────────────────────────
app.use('/api/incidents', incidentRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ─── Socket.IO Auth Middleware (mock for prototype) ─────
io.use((socket, next) => {
  const userId = socket.handshake.auth.userId as string;
  const userName = socket.handshake.auth.userName as string;

  if (!userId || !userName) {
    return next(new Error('Authentication required'));
  }

  socket.data.userId = userId;
  socket.data.userName = userName;
  next();
});

// ─── Socket Handlers ────────────────────────────────────
setupSocketHandlers(io);

// ─── Fallback to client ─────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../client/index.html'));
});

// ─── Start Server ───────────────────────────────────────
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║   🚨  PulseNet Emergency Response Server     ║
  ║   Running on http://localhost:${PORT}             ║
  ║   Ready for connections                       ║
  ╚═══════════════════════════════════════════════╝
  `);
});
