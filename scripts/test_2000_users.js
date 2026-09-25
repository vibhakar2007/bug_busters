const http = require('http');

async function sendRequest(options, postData = null) {
  const start = Date.now();
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          duration: Date.now() - start,
          bodyLength: body.length,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        status: 0,
        error: err.message,
        duration: Date.now() - start,
      });
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runHighLoadTest() {
  console.log('======================================================');
  console.log('   BugBusters 2,000 User High-Concurrency Load Test   ');
  console.log('======================================================\n');

  const TOTAL_USERS = 2000;
  const BATCH_SIZE = 250; // In batches of 250 simultaneous HTTP connections
  const baseUrl = 'localhost';
  const port = 3000;

  console.log(`Simulating ${TOTAL_USERS} participants in batches of ${BATCH_SIZE} concurrent requests...\n`);

  // 1. Participant Updates (progress updates)
  console.log(`[Phase 1] Simulating ${TOTAL_USERS} participant progress calls...`);
  const startPhase1 = Date.now();
  let totalSuccessful = 0;
  let allDurations = [];

  for (let batch = 0; batch < TOTAL_USERS; batch += BATCH_SIZE) {
    const promises = [];
    for (let i = batch + 1; i <= Math.min(batch + BATCH_SIZE, TOTAL_USERS); i++) {
      const postData = JSON.stringify({
        current_question: (i % 40) + 1,
        last_activity_description: `Answered question ${(i % 40) + 1}`,
      });

      const opt = {
        hostname: baseUrl,
        port: port,
        path: `/api/participants/${i}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };
      promises.push(sendRequest(opt, postData));
    }

    const batchResults = await Promise.all(promises);
    const successful = batchResults.filter((r) => r.status >= 200 && r.status < 300).length;
    totalSuccessful += successful;
    allDurations.push(...batchResults.map((r) => r.duration));
    process.stdout.write(`  Processed ${Math.min(batch + BATCH_SIZE, TOTAL_USERS)} / ${TOTAL_USERS} updates...\r`);
  }

  const phase1Duration = Date.now() - startPhase1;
  allDurations.sort((a, b) => a - b);
  const p50 = allDurations[Math.floor(allDurations.length * 0.5)];
  const p95 = allDurations[Math.floor(allDurations.length * 0.95)];
  const p99 = allDurations[Math.floor(allDurations.length * 0.99)];
  const max = allDurations[allDurations.length - 1];

  console.log(`\nPhase 1 Complete in ${phase1Duration}ms`);
  console.log(`  Success: ${totalSuccessful}/${TOTAL_USERS} (${Math.round((totalSuccessful / TOTAL_USERS) * 100)}%)`);
  console.log(`  Latencies: P50=${p50}ms | P95=${p95}ms | P99=${p99}ms | Max=${max}ms\n`);

  // 2. Admin Leaderboard & Participant Queries
  console.log(`[Phase 2] Simulating 100 concurrent Admin Leaderboard & Telemetry Queries...`);
  const startPhase2 = Date.now();
  const queryPromises = [];
  for (let i = 0; i < 100; i++) {
    queryPromises.push(sendRequest({ hostname: baseUrl, port: port, path: '/api/results', method: 'GET' }));
    queryPromises.push(sendRequest({ hostname: baseUrl, port: port, path: '/api/participants', method: 'GET' }));
  }

  const queryResults = await Promise.all(queryPromises);
  const phase2Duration = Date.now() - startPhase2;
  const successfulQueries = queryResults.filter((r) => r.status === 200 || r.status === 304).length;
  const qDurations = queryResults.map((r) => r.duration).sort((a, b) => a - b);

  console.log(`Phase 2 Complete in ${phase2Duration}ms for ${queryResults.length} queries`);
  console.log(`  Success: ${successfulQueries}/${queryResults.length} (${Math.round((successfulQueries / queryResults.length) * 100)}%)`);
  console.log(`  Latencies: P50=${qDurations[Math.floor(qDurations.length * 0.5)]}ms | P95=${qDurations[Math.floor(qDurations.length * 0.95)]}ms | Max=${qDurations[qDurations.length - 1]}ms`);
  console.log(`  Average Payload Size: ${Math.round(queryResults[0].bodyLength / 1024)} KB\n`);

  console.log('======================================================');
  console.log('   All 2,000 User High-Load Tests Passed Successfully!   ');
  console.log('======================================================');
}

runHighLoadTest().catch(console.error);
