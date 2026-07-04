import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { SERVER_PORT } from './config.js';
import { SessionWatcher } from './watchers/SessionWatcher.js';
import { JobWatcher } from './watchers/JobWatcher.js';
import { RosterWatcher } from './watchers/RosterWatcher.js';
import { GroupManager } from './services/GroupManager.js';
import { InstanceRegistry } from './services/InstanceRegistry.js';
import { InputRelay } from './services/InputRelay.js';
import { AutoYesManager } from './services/AutoYesManager.js';
import { WebSocketHandler } from './ws/handler.js';
import { createApiRouter } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
app.use(express.json());

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// Instantiate watchers
const sessionWatcher = new SessionWatcher();
const jobWatcher = new JobWatcher();
const rosterWatcher = new RosterWatcher();

// Instantiate services
const groupManager = new GroupManager();
const registry = new InstanceRegistry(sessionWatcher, jobWatcher, rosterWatcher, groupManager);
const inputRelay = new InputRelay(rosterWatcher);
const autoYesManager = new AutoYesManager(registry, inputRelay);

// Set up WebSocket handler
new WebSocketHandler(wss, registry, groupManager, inputRelay, autoYesManager);

// Mount API routes
const apiRouter = createApiRouter(registry, groupManager, inputRelay, autoYesManager);
app.use('/api', apiRouter);

// Serve static files from client/dist (works both in dev and when installed as a package)
const pkgRoot = path.resolve(__dirname, '..', '..');
const clientDistPath = path.resolve(pkgRoot, 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // SPA fallback: serve index.html for non-API routes
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Subscribe to events BEFORE starting watchers so initial emissions are captured
registry.start();
sessionWatcher.start();
jobWatcher.start();
rosterWatcher.start();

// Start the server
server.listen(SERVER_PORT, () => {
  console.log(`[ClauDeck] Server listening on http://localhost:${SERVER_PORT}`);
  console.log(`[ClauDeck] WebSocket available at ws://localhost:${SERVER_PORT}/ws`);
  console.log(`[ClauDeck] API available at http://localhost:${SERVER_PORT}/api`);
});
