import { Router } from 'express';
import type { Request, Response } from 'express';
import type { InstanceRegistry } from '../services/InstanceRegistry.js';
import type { GroupManager } from '../services/GroupManager.js';
import type { InputRelay } from '../services/InputRelay.js';
import type { AutoYesManager } from '../services/AutoYesManager.js';
import { extractPendingPrompt } from '../services/PromptExtractor.js';

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

export function createApiRouter(
  registry: InstanceRegistry,
  groupManager: GroupManager,
  inputRelay: InputRelay,
  autoYesManager: AutoYesManager,
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

  return router;
}
