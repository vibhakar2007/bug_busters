import fs from 'fs/promises';
import path from 'path';

export async function readJsonData<T>(fileName: string, fallback: T): Promise<T> {
  try {
    const dataPath = path.join(process.cwd(), 'data', fileName);
    const content = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    try {
      const srcPath = path.join(process.cwd(), 'src', 'data', fileName);
      const content = await fs.readFile(srcPath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return fallback;
    }
  }
}

export async function writeJsonData<T>(fileName: string, data: T): Promise<void> {
  const jsonString = JSON.stringify(data, null, 2);
  const dataPath = path.join(process.cwd(), 'data', fileName);
  const srcPath = path.join(process.cwd(), 'src', 'data', fileName);

  await Promise.allSettled([
    fs.writeFile(dataPath, jsonString, 'utf-8'),
    fs.writeFile(srcPath, jsonString, 'utf-8'),
  ]);
}
