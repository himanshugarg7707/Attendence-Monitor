/**
 * ═══════════════════════════════════════════════════════════════════
 *  Server Entry Point — Hono Application
 *
 *  Trusted Proximity Attendance System
 *  Runtime: Node.js with @hono/node-server + WebSocket
 * ═══════════════════════════════════════════════════════════════════
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';

import { CONFIG } from './config.js';
import { authRoutes } from './routes/auth.routes.js';
import { attendanceRoutes } from './routes/attendance.routes.js';
import { createDashboardRoutes } from './routes/dashboard.routes.js';
import { startHeartbeat } from './services/broadcast.service.js';
import { seedDemoData } from './store/memory-store.js';

// ─── App Initialization ─────────────────────────────────────────

const app = new Hono();

// Create WebSocket upgrader for Node.js
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// ─── Global Middleware ───────────────────────────────────────────

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: [CONFIG.RP.origin, 'http://localhost:5173', 'http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// ─── Mount Routes ────────────────────────────────────────────────

app.route('/api/auth', authRoutes);
app.route('/api/attendance', attendanceRoutes);
app.route('/api/dashboard', createDashboardRoutes(upgradeWebSocket as any));

// ─── Health Check ────────────────────────────────────────────────

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'Trusted Proximity Attendance',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── Root Info ───────────────────────────────────────────────────

app.get('/', (c) => {
  return c.json({
    name: 'Trusted Proximity Attendance API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      auth: {
        registerOptions: 'POST /api/auth/register/options',
        registerVerify: 'POST /api/auth/register/verify',
        assertionOptions: 'POST /api/auth/assertion/options',
      },
      attendance: {
        verify: 'POST /api/attendance/verify (Proximity Guard protected)',
        startSession: 'POST /api/attendance/session/start',
        endSession: 'POST /api/attendance/session/end',
        listSessions: 'GET /api/attendance/sessions',
        getLog: 'GET /api/attendance/log/:sessionId',
      },
      dashboard: {
        ws: 'WS /api/dashboard/ws?classroomId=...',
        stats: 'GET /api/dashboard/stats',
      },
    },
  });
});

// ─── Start Server ────────────────────────────────────────────────

// Seed demo data
seedDemoData();

// Start WebSocket heartbeat
startHeartbeat();

const server = serve(
  {
    fetch: app.fetch,
    port: CONFIG.PORT,
  },
  (info) => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  🛡️  Trusted Proximity Attendance System');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Server:     http://localhost:${info.port}`);
    console.log(`  Dashboard:  ws://localhost:${info.port}/api/dashboard/ws`);
    console.log(`  RP ID:      ${CONFIG.RP.id}`);
    console.log(`  RP Origin:  ${CONFIG.RP.origin}`);
    console.log(`  RSSI Gate:  > ${CONFIG.PROXIMITY.RSSI_THRESHOLD} dBm`);
    console.log(`  HLC Drift:  ± ${CONFIG.HLC.MAX_DRIFT_MS}ms`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
  },
);

// Inject WebSocket handler into the HTTP server
injectWebSocket(server);

export default app;
