import { Router } from 'express';
import type { Request, Response } from 'express';
import type { InstanceRegistry } from '../services/InstanceRegistry.js';
import type { GroupManager } from '../services/GroupManager.js';
import type { InputRelay } from '../services/InputRelay.js';
import type { AutoYesManager } from '../services/AutoYesManager.js';
import type { StatusLineReceiver } from '../services/StatusLineReceiver.js';
import type { TranscriptIndexer } from '../services/TranscriptIndexer.js';
import type { NotificationDispatcher } from '../services/NotificationDispatcher.js';
import { extractPendingPrompt } from '../services/PromptExtractor.js';
import { analyzePermissions } from '../services/PermissionAnalyzer.js';

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

export function createApiRouter(
  registry: InstanceRegistry,
  groupManager: GroupManager,
  inputRelay: InputRelay,
  autoYesManager: AutoYesManager,
  statusLineReceiver: StatusLineReceiver,
  transcriptIndexer: TranscriptIndexer,
  notificationDispatcher: NotificationDispatcher,
): Router {
  const router = Router();

  router.get('/instances', (_req: Request, res: Response) => {
    res.json(registry.getAll());
  });

  router.get('/instances/:sessionId', (req: Request, res: Response) => {
    const instance = registry.getBySessionId(param(req, 'sessionId'));
    if (!instance) {
      res.status(404).json({ error: 'Instance not found' });
      return;
    }
    res.json(instance);
  });

  router.get('/instances/:sessionId/prompt', (req: Request, res: Response) => {
    const instance = registry.getBySessionId(param(req, 'sessionId'));
    if (!instance) {
      res.status(404).json({ error: 'Instance not found' });
      return;
    }
    const prompt = extractPendingPrompt(instance.sessionId, instance.cwd);
    res.json(prompt);
  });

  router.get('/instances/:sessionId/permissions', (req: Request, res: Response) => {
    const instance = registry.getBySessionId(param(req, 'sessionId'));
    if (!instance) {
      res.status(404).json({ error: 'Instance not found' });
      return;
    }
    const profile = analyzePermissions(instance.cwd);
    res.json(profile);
  });

  router.post('/instances/:sessionId/reply', async (req: Request, res: Response) => {
    const instance = registry.getBySessionId(param(req, 'sessionId'));
    if (!instance) {
      res.status(404).json({ error: 'Instance not found' });
      return;
    }

    const { text } = req.body;
    if (typeof text !== 'string' || !text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    const result = await inputRelay.sendReply(instance, text);
    res.json(result);
  });

  router.post('/instances/:sessionId/cancel', (req: Request, res: Response) => {
    const instance = registry.getBySessionId(param(req, 'sessionId'));
    if (!instance) {
      res.status(404).json({ error: 'Instance not found' });
      return;
    }
    const result = inputRelay.sendSignal(instance.pid, 'cancel');
    res.json(result);
  });

  router.post('/instances/:sessionId/stop', (req: Request, res: Response) => {
    const instance = registry.getBySessionId(param(req, 'sessionId'));
    if (!instance) {
      res.status(404).json({ error: 'Instance not found' });
      return;
    }
    const result = inputRelay.sendSignal(instance.pid, 'stop');
    res.json(result);
  });

  router.put('/instances/:sessionId/autoyes', (req: Request, res: Response) => {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'enabled (boolean) is required' });
      return;
    }

    const sid = param(req, 'sessionId');
    registry.setAutoYes(sid, enabled);
    autoYesManager.setAutoYes(sid, enabled);
    res.json({ success: true, sessionId: sid, autoYes: enabled });
  });

  router.get('/groups', (_req: Request, res: Response) => {
    res.json(groupManager.getAll());
  });

  router.post('/groups', (req: Request, res: Response) => {
    const { name } = req.body;
    if (typeof name !== 'string' || !name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const group = groupManager.create(name);
    res.status(201).json(group);
  });

  router.put('/groups/:groupId', (req: Request, res: Response) => {
    try {
      const group = groupManager.update(param(req, 'groupId'), req.body);
      res.json(group);
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  router.delete('/groups/:groupId', (req: Request, res: Response) => {
    try {
      groupManager.delete(param(req, 'groupId'));
      res.status(204).send();
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  router.post('/groups/:groupId/instances/:sessionId', (req: Request, res: Response) => {
    try {
      const gid = param(req, 'groupId');
      const sid = param(req, 'sessionId');
      groupManager.addInstance(gid, sid);
      registry.setGroup(sid, gid);
      res.json({ success: true });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  router.delete('/groups/:groupId/instances/:sessionId', (req: Request, res: Response) => {
    try {
      const gid = param(req, 'groupId');
      const sid = param(req, 'sessionId');
      groupManager.removeInstance(gid, sid);
      registry.setGroup(sid, null);
      res.json({ success: true });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  router.get('/autoyes/log', (_req: Request, res: Response) => {
    res.json(autoYesManager.getLog());
  });

  // Status line endpoint
  router.post('/status-line', (req: Request, res: Response) => {
    statusLineReceiver.receive(req.body);
    res.json({ ok: true });
  });

  // Full-text search endpoint
  router.get('/search', (req: Request, res: Response) => {
    const q = req.query.q;
    if (typeof q !== 'string' || !q.trim()) {
      res.status(400).json({ error: 'q query parameter is required' });
      return;
    }
    const limit = parseInt(String(req.query.limit ?? '20'), 10);
    const results = transcriptIndexer.search(q, limit);
    res.json(results);
  });

  // Webhook config endpoints
  router.get('/settings/webhooks', (_req: Request, res: Response) => {
    res.json(notificationDispatcher.getConfigs());
  });

  router.put('/settings/webhooks', (req: Request, res: Response) => {
    const configs = req.body;
    if (!Array.isArray(configs)) {
      res.status(400).json({ error: 'Body must be an array of webhook configs' });
      return;
    }
    notificationDispatcher.setConfigs(configs);
    res.json({ ok: true });
  });

  return router;
}
