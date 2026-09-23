import fs from 'fs/promises';
import path from 'path';

// Mutex queue per file path to serialize concurrent operations
const fileQueues = new Map<string, Promise<unknown>>();

function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
  const currentQueue = fileQueues.get(key) || Promise.resolve();
  const nextQueue = currentQueue.then(task, task);
  fileQueues.set(key, nextQueue);
  return nextQueue;
}

// In-memory cache to handle heavy concurrent reads
const memoryCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 200; // 200ms cache to absorb rapid bursts from concurrent clients

async function safeReadFile(filePath: string): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'ENOENT') return null;
      // If file is briefly locked on Windows, wait a few ms and retry
      await new Promise((r) => setTimeout(r, 15 * (attempt + 1)));
    }
  }
  return null;
}

async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const dir = path.dirname(filePath);

  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });

  // Write to temporary file first
  await fs.writeFile(tempPath, content, 'utf-8');

  // Atomically rename to destination (with Windows EPERM / EBUSY retry)
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await fs.rename(tempPath, filePath);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 20 * (attempt + 1)));
    }
  }

  // Fallback: direct write if rename fails
  try {
    await fs.writeFile(filePath, content, 'utf-8');
  } finally {
    try {
      await fs.unlink(tempPath);
    } catch {
      // ignore cleanup error
    }
  }
}

export async function readJsonData<T>(fileName: string, fallback: T): Promise<T> {
  const cached = memoryCache.get(fileName);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }

  return enqueue(fileName, async () => {
    // Re-check cache after queue turn
    const c = memoryCache.get(fileName);
    if (c && Date.now() - c.timestamp < CACHE_TTL_MS) {
      return c.data as T;
    }

    const dataPath = path.join(process.cwd(), 'data', fileName);
    const content = await safeReadFile(dataPath);

    if (content && content.trim().length > 0) {
      try {
        const parsed = JSON.parse(content) as T;
        memoryCache.set(fileName, { data: parsed, timestamp: Date.now() });
        return parsed;
      } catch (e) {
        console.warn(`JSON parse error in ${dataPath}, trying src/data fallback:`, e);
      }
    }

    const srcPath = path.join(process.cwd(), 'src', 'data', fileName);
    const srcContent = await safeReadFile(srcPath);
    if (srcContent && srcContent.trim().length > 0) {
      try {
        const parsed = JSON.parse(srcContent) as T;
        memoryCache.set(fileName, { data: parsed, timestamp: Date.now() });
        return parsed;
      } catch {
        // use fallback
      }
    }

    return fallback;
  });
}

export async function writeJsonData<T>(fileName: string, data: T): Promise<void> {
  // Update in-memory cache immediately
  memoryCache.set(fileName, { data, timestamp: Date.now() });

  return enqueue(fileName, async () => {
    const jsonString = JSON.stringify(data, null, 2);
    const dataPath = path.join(process.cwd(), 'data', fileName);

    try {
      await atomicWriteFile(dataPath, jsonString);
    } catch (err) {
      console.warn(`Failed writing to ${dataPath}:`, err);
    }
  });
}

/**
 * Perform atomic read-modify-write on a JSON data file without race conditions
 */
export async function updateJsonData<T>(
  fileName: string,
  fallback: T,
  updater: (current: T) => T | Promise<T>
): Promise<T> {
  return enqueue(fileName, async () => {
    let current = fallback;
    const dataPath = path.join(process.cwd(), 'data', fileName);
    const content = await safeReadFile(dataPath);

    if (content && content.trim().length > 0) {
      try {
        current = JSON.parse(content) as T;
      } catch {
        const srcPath = path.join(process.cwd(), 'src', 'data', fileName);
        const srcContent = await safeReadFile(srcPath);
        if (srcContent && srcContent.trim().length > 0) {
          try {
            current = JSON.parse(srcContent) as T;
          } catch {
            current = fallback;
          }
        }
      }
    }

    const updated = await updater(current);
    memoryCache.set(fileName, { data: updated, timestamp: Date.now() });

    const jsonString = JSON.stringify(updated, null, 2);
    try {
      await atomicWriteFile(dataPath, jsonString);
    } catch (err) {
      console.warn(`Failed atomic update to ${dataPath}:`, err);
    }

    return updated;
  });
}
