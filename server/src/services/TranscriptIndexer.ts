import fs from 'fs';
import path from 'path';
import MiniSearch from 'minisearch';
import chokidar, { type FSWatcher } from 'chokidar';
import { PROJECTS_DIR } from '../config.js';
import type { SearchResult } from '../types.js';

interface IndexedDoc {
  id: number;
  content: string;
  sessionId: string;
  cwd: string;
  timestamp: number;
  role: string;
}

function readdirRecursive(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...readdirRecursive(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory may not exist
  }
  return results;
}

function decodeCwd(dirName: string): string {
  // Reverse the encodeCwd from PromptExtractor: replace leading dash with /,
  // then other dashes back to / or _. This is a best-effort reverse.
  // The directory name under projects/ is the encoded cwd.
  return dirName;
}

export class TranscriptIndexer {
  private index: MiniSearch<IndexedDoc>;
  private nextId = 1;
  private byteOffsets = new Map<string, number>();
  private watcher: FSWatcher | null = null;

  constructor() {
    this.index = new MiniSearch<IndexedDoc>({
      fields: ['content'],
      storeFields: ['sessionId', 'cwd', 'timestamp', 'role', 'content'],
      searchOptions: {
        prefix: true,
        fuzzy: 0.2,
      },
    });
  }

  start(): void {
    // Initial scan
    if (fs.existsSync(PROJECTS_DIR)) {
      const files = readdirRecursive(PROJECTS_DIR);
      for (const file of files) {
        this.indexFile(file);
      }
    }

    // Watch for new/changed files
    try {
      if (!fs.existsSync(PROJECTS_DIR)) {
        fs.mkdirSync(PROJECTS_DIR, { recursive: true });
      }
      this.watcher = chokidar.watch(PROJECTS_DIR, {
        persistent: true,
        ignoreInitial: true,
        depth: 5,
      });

      this.watcher.on('add', (filePath: string) => {
        if (filePath.endsWith('.jsonl')) {
          this.indexFile(filePath);
        }
      });

      this.watcher.on('change', (filePath: string) => {
        if (filePath.endsWith('.jsonl')) {
          this.indexNewLines(filePath);
        }
      });

      this.watcher.on('error', (err: unknown) => {
        console.error('[TranscriptIndexer] watcher error:', err instanceof Error ? err.message : err);
      });
    } catch (err) {
      console.error('[TranscriptIndexer] Failed to start watcher:', err);
    }
  }

  search(query: string, limit: number = 20): SearchResult[] {
    const results = this.index.search(query).slice(0, limit);
    return results.map((r) => ({
      sessionId: (r as unknown as IndexedDoc).sessionId,
      cwd: (r as unknown as IndexedDoc).cwd,
      timestamp: (r as unknown as IndexedDoc).timestamp,
      role: (r as unknown as IndexedDoc).role,
      snippet: this.extractSnippet((r as unknown as IndexedDoc).content, query),
      score: r.score,
    }));
  }

  private indexFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const { sessionId, cwd } = this.extractMeta(filePath);

      let offset = 0;
      for (const line of lines) {
        offset += Buffer.byteLength(line, 'utf-8') + 1; // +1 for newline
        if (!line.trim()) continue;
        this.indexLine(line, sessionId, cwd);
      }

      this.byteOffsets.set(filePath, Buffer.byteLength(content, 'utf-8'));
    } catch {
      // File may not be readable
    }
  }

  private indexNewLines(filePath: string): void {
    try {
      const previousOffset = this.byteOffsets.get(filePath) ?? 0;
      const stat = fs.statSync(filePath);
      if (stat.size <= previousOffset) return;

      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(stat.size - previousOffset);
      fs.readSync(fd, buf, 0, buf.length, previousOffset);
      fs.closeSync(fd);

      const newContent = buf.toString('utf-8');
      const lines = newContent.split('\n');
      const { sessionId, cwd } = this.extractMeta(filePath);

      for (const line of lines) {
        if (!line.trim()) continue;
        this.indexLine(line, sessionId, cwd);
      }

      this.byteOffsets.set(filePath, stat.size);
    } catch {
      // Ignore errors during incremental indexing
    }
  }

  private indexLine(line: string, sessionId: string, cwd: string): void {
    try {
      const entry = JSON.parse(line);
      const msg = entry.message;
      if (!msg) return;

      const role = msg.role ?? 'unknown';
      const timestamp = entry.timestamp ?? Date.now();

      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          let text = '';
          if (block.type === 'text' && block.text) {
            text = block.text;
          } else if (block.type === 'tool_use') {
            text = `[${block.name}] ${JSON.stringify(block.input ?? {}).slice(0, 500)}`;
          } else if (block.type === 'tool_result' && typeof block.content === 'string') {
            text = block.content;
          }

          if (text.length > 0) {
            const doc: IndexedDoc = {
              id: this.nextId++,
              content: text.slice(0, 2000), // Limit content length
              sessionId,
              cwd,
              timestamp,
              role,
            };
            this.index.add(doc);
          }
        }
      } else if (typeof msg.content === 'string' && msg.content.length > 0) {
        const doc: IndexedDoc = {
          id: this.nextId++,
          content: msg.content.slice(0, 2000),
          sessionId,
          cwd,
          timestamp,
          role,
        };
        this.index.add(doc);
      }
    } catch {
      // Skip malformed lines
    }
  }

  private extractMeta(filePath: string): { sessionId: string; cwd: string } {
    // File path is like: PROJECTS_DIR/<encoded-cwd>/<sessionId>.jsonl
    const basename = path.basename(filePath, '.jsonl');
    const dirName = path.basename(path.dirname(filePath));
    return {
      sessionId: basename,
      cwd: decodeCwd(dirName),
    };
  }

  private extractSnippet(content: string, query: string): string {
    const lower = content.toLowerCase();
    const queryLower = query.toLowerCase();
    const idx = lower.indexOf(queryLower);

    if (idx === -1) {
      // Return first 200 chars as snippet
      return content.slice(0, 200);
    }

    const start = Math.max(0, idx - 80);
    const end = Math.min(content.length, idx + query.length + 80);
    let snippet = content.slice(start, end);

    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  }
}
