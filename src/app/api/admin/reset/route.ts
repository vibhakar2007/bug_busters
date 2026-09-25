import { NextResponse } from 'next/server';
import { writeJsonData, flushAllDirtyFiles } from '@/lib/server/jsonStorage';
import fs from 'fs/promises';
import path from 'path';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning, bypass-tunnel-reminder',
    'ngrok-skip-browser-warning': 'true',
    'bypass-tunnel-reminder': 'true',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function POST() {
  try {
    // 1. Reset primary storage via writeJsonData
    await writeJsonData('participants.json', []);
    await writeJsonData('activity.json', []);
    await writeJsonData('results.json', []);
    await flushAllDirtyFiles();

    // 2. Ensure both data/ and src/data/ mirrors are wiped cleanly
    const files = ['participants.json', 'activity.json', 'results.json'];
    for (const file of files) {
      const dataPath = path.join(process.cwd(), 'data', file);
      const srcPath = path.join(process.cwd(), 'src', 'data', file);

      try {
        await fs.writeFile(dataPath, '[]', 'utf-8');
      } catch {
        // Ignore
      }

      try {
        await fs.writeFile(srcPath, '[]', 'utf-8');
      } catch {
        // Ignore
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'All participants and activity logs have been erased successfully.',
      },
      { status: 200, headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Failed to reset participants and activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to reset system records' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
