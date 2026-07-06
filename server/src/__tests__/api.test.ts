import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import { startServer, type StartServerResult } from '../index.js';

/**
 * API integration tests for ClauPilot server.
 *
 * Starts the Express server on a random available port before all tests
 * and tears it down after. Uses native fetch() for HTTP requests.
 */

let result: StartServerResult;
let baseUrl: string;

/**
 * Pick a random port in the ephemeral range to avoid collisions with a
 * running dev server or other test suites.
 */
function randomPort(): number {
  return 10000 + Math.floor(Math.random() * 50000);
}

before(async () => {
  const port = randomPort();
  result = await startServer(port);
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (result?.cleanup) {
    await result.cleanup();
  }
});

// ---------------------------------------------------------------------------
// GET /api/instances
// ---------------------------------------------------------------------------
describe('GET /api/instances', () => {
  it('returns an array (may be empty in test)', async () => {
    const res = await fetch(`${baseUrl}/api/instances`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body), 'response should be an array');
  });
});

// ---------------------------------------------------------------------------
// GET /api/instances/:sessionId
// ---------------------------------------------------------------------------
describe('GET /api/instances/:sessionId', () => {
  it('returns 404 for an unknown session', async () => {
    const res = await fetch(`${baseUrl}/api/instances/nonexistent-session-id`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, 'Instance not found');
  });
});

// ---------------------------------------------------------------------------
// GET /api/search
// ---------------------------------------------------------------------------
describe('GET /api/search', () => {
  it('returns an array when q is provided', async () => {
    const res = await fetch(`${baseUrl}/api/search?q=test`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body), 'search results should be an array');
  });

  it('returns 400 when q parameter is missing', async () => {
    const res = await fetch(`${baseUrl}/api/search`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'q query parameter is required');
  });

  it('returns 400 when q is empty string', async () => {
    const res = await fetch(`${baseUrl}/api/search?q=`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'q query parameter is required');
  });

  it('returns 400 when q is whitespace only', async () => {
    const res = await fetch(`${baseUrl}/api/search?q=%20%20`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'q query parameter is required');
  });
});

// ---------------------------------------------------------------------------
// POST /api/instances/:sessionId/cancel
// ---------------------------------------------------------------------------
describe('POST /api/instances/:sessionId/cancel', () => {
  it('returns 404 for an unknown session', async () => {
    const res = await fetch(`${baseUrl}/api/instances/nonexistent-session-id/cancel`, {
      method: 'POST',
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, 'Instance not found');
  });
});

// ---------------------------------------------------------------------------
// POST /api/instances/:sessionId/stop
// ---------------------------------------------------------------------------
describe('POST /api/instances/:sessionId/stop', () => {
  it('returns 404 for an unknown session', async () => {
    const res = await fetch(`${baseUrl}/api/instances/nonexistent-session-id/stop`, {
      method: 'POST',
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, 'Instance not found');
  });
});

// ---------------------------------------------------------------------------
// GET /api/groups
// ---------------------------------------------------------------------------
describe('GET /api/groups', () => {
  it('returns an array', async () => {
    const res = await fetch(`${baseUrl}/api/groups`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body), 'groups should be an array');
  });
});

// ---------------------------------------------------------------------------
// POST /api/groups  +  DELETE /api/groups/:id
// ---------------------------------------------------------------------------
describe('POST /api/groups', () => {
  it('creates a group and returns 201 with the group object', async () => {
    const res = await fetch(`${baseUrl}/api/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test-group' }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.name, 'test-group');
    assert.ok(typeof body.id === 'string' && body.id.length > 0, 'should have an id');
    assert.equal(body.collapsed, false);
    assert.ok(Array.isArray(body.instanceIds), 'instanceIds should be an array');
  });

  it('returns 400 when name is missing', async () => {
    const res = await fetch(`${baseUrl}/api/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'name is required');
  });
});

describe('DELETE /api/groups/:id', () => {
  it('deletes a previously created group', async () => {
    // First create a group to delete
    const createRes = await fetch(`${baseUrl}/api/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'to-delete' }),
    });
    const created = await createRes.json();
    assert.ok(created.id);

    // Now delete it
    const deleteRes = await fetch(`${baseUrl}/api/groups/${created.id}`, {
      method: 'DELETE',
    });
    assert.equal(deleteRes.status, 204);

    // Confirm it no longer appears in the list
    const listRes = await fetch(`${baseUrl}/api/groups`);
    const groups = await listRes.json();
    const found = groups.find((g: { id: string }) => g.id === created.id);
    assert.equal(found, undefined, 'deleted group should not appear in list');
  });

  it('returns 404 when deleting a nonexistent group', async () => {
    const res = await fetch(`${baseUrl}/api/groups/nonexistent-group-id`, {
      method: 'DELETE',
    });
    assert.equal(res.status, 404);
  });
});

// ---------------------------------------------------------------------------
// GET /api/settings/webhooks
// ---------------------------------------------------------------------------
describe('GET /api/settings/webhooks', () => {
  it('returns an array', async () => {
    const res = await fetch(`${baseUrl}/api/settings/webhooks`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body), 'webhooks should be an array');
  });
});

// ---------------------------------------------------------------------------
// PUT /api/instances/:sessionId/autoyes
// ---------------------------------------------------------------------------
describe('PUT /api/instances/:sessionId/autoyes', () => {
  it('returns 400 when enabled field is missing', async () => {
    const res = await fetch(`${baseUrl}/api/instances/some-session/autoyes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'enabled (boolean) is required');
  });
});

// ---------------------------------------------------------------------------
// POST /api/instances/:sessionId/reply
// ---------------------------------------------------------------------------
describe('POST /api/instances/:sessionId/reply', () => {
  it('returns 404 for an unknown session', async () => {
    const res = await fetch(`${baseUrl}/api/instances/nonexistent-session-id/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'hello' }),
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, 'Instance not found');
  });
});

// ---------------------------------------------------------------------------
// GET /api/autoyes/log
// ---------------------------------------------------------------------------
describe('GET /api/autoyes/log', () => {
  it('returns an array', async () => {
    const res = await fetch(`${baseUrl}/api/autoyes/log`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body), 'autoyes log should be an array');
  });
});

// ---------------------------------------------------------------------------
// PUT /api/settings/webhooks
// ---------------------------------------------------------------------------
describe('PUT /api/settings/webhooks', () => {
  it('returns 400 when body is not an array', async () => {
    const res = await fetch(`${baseUrl}/api/settings/webhooks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://example.com' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'Body must be an array of webhook configs');
  });

  it('accepts an empty array', async () => {
    const res = await fetch(`${baseUrl}/api/settings/webhooks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([]),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
  });
});
