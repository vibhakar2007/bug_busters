const http = require('http');

async function sendRequest(options, postData = null) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
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

async function runLoadTest() {
  console.log('--- Starting Simultaneous Concurrency Load Test (200 Users) ---');

  const NUM_USERS = 200;
  const baseUrl = 'localhost';
  const port = 3000;

  // Phase 1: 200 Simultaneous participant registrations / updates
  console.log(`\nPhase 1: Simulating ${NUM_USERS} simultaneous participant updates...`);
  const updatePromises = [];
  const startPhase1 = Date.now();

  for (let i = 1; i <= NUM_USERS; i++) {
    const postData = JSON.stringify({
      current_question: Math.floor(Math.random() * 40) + 1,
      last_activity_description: `Answered question ${i}`,
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

    updatePromises.push(sendRequest(opt, postData));
  }

  const updateResults = await Promise.all(updatePromises);
  const phase1Duration = Date.now() - startPhase1;

  const successfulUpdates = updateResults.filter((r) => r.status >= 200 && r.status < 300);
  const durations1 = updateResults.map((r) => r.duration).sort((a, b) => a - b);
  const p50_1 = durations1[Math.floor(durations1.length * 0.5)];
  const p95_1 = durations1[Math.floor(durations1.length * 0.95)];
  const p99_1 = durations1[Math.floor(durations1.length * 0.99)];
  const max_1 = durations1[durations1.length - 1];

  console.log(`Phase 1 Finished in ${phase1Duration}ms`);
  console.log(`Success Rate: ${successfulUpdates.length}/${NUM_USERS} (${Math.round((successfulUpdates.length / NUM_USERS) * 100)}%)`);
  console.log(`Latencies: P50=${p50_1}ms | P95=${p95_1}ms | P99=${p99_1}ms | Max=${max_1}ms`);

  // Phase 2: 200 Simultaneous Activity log emissions
  console.log(`\nPhase 2: Simulating ${NUM_USERS} simultaneous activity event posts...`);
  const activityPromises = [];
  const startPhase2 = Date.now();

  for (let i = 1; i <= NUM_USERS; i++) {
    const postData = JSON.stringify({
      participant_id: i,
      participant_name: `Participant #${i}`,
      registration_number: `98765432${(10 + i).toString().slice(-2)}`,
      question_id: (i % 40) + 1,
      event_type: 'answer_selected',
      selected_option: ['A', 'B', 'C', 'D'][i % 4],
      details: `Option selected by user ${i}`,
    });

    const opt = {
      hostname: baseUrl,
      port: port,
      path: '/api/activity',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    activityPromises.push(sendRequest(opt, postData));
  }

  const activityResults = await Promise.all(activityPromises);
  const phase2Duration = Date.now() - startPhase2;

  const successfulActivities = activityResults.filter((r) => r.status >= 200 && r.status < 300);
  const durations2 = activityResults.map((r) => r.duration).sort((a, b) => a - b);
  const p50_2 = durations2[Math.floor(durations2.length * 0.5)];
  const p95_2 = durations2[Math.floor(durations2.length * 0.95)];
  const p99_2 = durations2[Math.floor(durations2.length * 0.99)];
  const max_2 = durations2[durations2.length - 1];

  console.log(`Phase 2 Finished in ${phase2Duration}ms`);
  console.log(`Success Rate: ${successfulActivities.length}/${NUM_USERS} (${Math.round((successfulActivities.length / NUM_USERS) * 100)}%)`);
  console.log(`Latencies: P50=${p50_2}ms | P95=${p95_2}ms | P99=${p99_2}ms | Max=${max_2}ms`);

  // Phase 3: Simultaneous Admin Results + Participants + Live Feed fetches under load
  console.log(`\nPhase 3: Simulating 50 concurrent admin queries for Results, Participants, and Activities...`);
  const queryPromises = [];
  const startPhase3 = Date.now();

  for (let i = 0; i < 50; i++) {
    queryPromises.push(sendRequest({ hostname: baseUrl, port: port, path: '/api/results', method: 'GET' }));
    queryPromises.push(sendRequest({ hostname: baseUrl, port: port, path: '/api/participants', method: 'GET' }));
    queryPromises.push(sendRequest({ hostname: baseUrl, port: port, path: '/api/activity?limit=50', method: 'GET' }));
  }

  const queryResults = await Promise.all(queryPromises);
  const phase3Duration = Date.now() - startPhase3;
  const successfulQueries = queryResults.filter((r) => r.status === 200 || r.status === 304);
  const durations3 = queryResults.map((r) => r.duration).sort((a, b) => a - b);
  const p50_3 = durations3[Math.floor(durations3.length * 0.5)];
  const p95_3 = durations3[Math.floor(durations3.length * 0.95)];
  const max_3 = durations3[durations3.length - 1];

  console.log(`Phase 3 Finished in ${phase3Duration}ms for ${queryResults.length} queries`);
  console.log(`Success Rate: ${successfulQueries.length}/${queryResults.length} (${Math.round((successfulQueries.length / queryResults.length) * 100)}%)`);
  console.log(`Latencies: P50=${p50_3}ms | P95=${p95_3}ms | Max=${max_3}ms`);
  console.log(`Avg Results Payload Size: ~${Math.round(queryResults[0].bodyLength / 1024)} KB`);

  console.log('\n--- Load Test Completed Successfully ---');
}

runLoadTest().catch(console.error);
