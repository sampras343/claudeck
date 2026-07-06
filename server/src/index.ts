import express from 'express';
import { createServer } from 'http';
import type { Server } from 'http';
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
import { StatusLineReceiver } from './services/StatusLineReceiver.js';
import { TranscriptIndexer } from './services/TranscriptIndexer.js';
import { NotificationDispatcher } from './services/NotificationDispatcher.js';
import { WebSocketHandler } from './ws/handler.js';
import { createApiRouter } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface StartServerResult {
  app: express.Express;
  server: Server;
  cleanup: () => Promise<void>;
}

export function startServer(port: number = SERVER_PORT): Promise<StartServerResult> {
  const app = express();
  app.use(express.json());

  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  const sessionWatcher = new SessionWatcher();
  const jobWatcher = new JobWatcher();
  const rosterWatcher = new RosterWatcher();

  const groupManager = new GroupManager();
  const statusLineReceiver = new StatusLineReceiver();
  const transcriptIndexer = new TranscriptIndexer();
  const notificationDispatcher = new NotificationDispatcher();
  const registry = new InstanceRegistry(sessionWatcher, jobWatcher, rosterWatcher, groupManager, statusLineReceiver);
  const inputRelay = new InputRelay(rosterWatcher);
  const autoYesManager = new AutoYesManager(registry, inputRelay);

  new WebSocketHandler(wss, registry, groupManager, inputRelay, autoYesManager, undefined, notificationDispatcher);

  const apiRouter = createApiRouter(
    registry,
    groupManager,
    inputRelay,
    autoYesManager,
    statusLineReceiver,
    transcriptIndexer,
    notificationDispatcher,
  );
  app.use('/api', apiRouter);

  const pkgRoot = path.resolve(__dirname, '..', '..');
  const clientDistPath = path.resolve(pkgRoot, 'client', 'dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  registry.start();
  sessionWatcher.start();
  jobWatcher.start();
  rosterWatcher.start();
  transcriptIndexer.start();

  statusLineReceiver.on('status-line:update', (sessionName: string) => {
    for (const instance of registry.getAll()) {
      if (instance.name === sessionName) {
        registry.setAutoYes(instance.sessionId, instance.autoYes);
      }
    }
  });

  const cleanup = async () => {
    sessionWatcher.stop();
    jobWatcher.stop();
    rosterWatcher.stop();
    wss.close();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  };

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      console.log(`[ClauPilot] Server listening on http://localhost:${port}`);
      console.log(`[ClauPilot] Dashboard at http://localhost:${port}`);
      resolve({ app, server, cleanup });
    });
  });
}

// Start the server when this file is run directly (not imported)
const isDirectRun = process.argv[1] &&
  (fileURLToPath(import.meta.url) === process.argv[1] ||
   fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1]));

if (isDirectRun) {
  startServer();
}
