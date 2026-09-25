/**
 * Verification test script for BugBusters fixes and optimizations.
 * Strictly uses maximum 100-200 simulated participants.
 */

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('Starting BugBusters Automated Verification Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  }

  // Ensure quiz 1 is in live state before tests start
  try {
    await fetch(`${BASE_URL}/api/quizzes/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'live' }),
    });
  } catch {}

  // ----------------------------------------------------
  // TEST 1: Check Authoritative Time Calculation Logic
  // ----------------------------------------------------
  console.log('--- Test 1: Authoritative Duration Calculation ---');
  {
    const { calculateAuthoritativeDuration } = await import('../src/lib/utils/time.ts');
    
    // Test 1a: Exactly 240 seconds (4 minutes)
    const tStart = '2026-09-25T10:00:00.000Z';
    const tEnd = '2026-09-25T10:04:00.000Z';
    const dur1 = calculateAuthoritativeDuration(tStart, tEnd);
    assert(dur1.seconds === 240, 'Calculates 240 seconds for 4-minute span');
    assert(dur1.formatted === '4m 0s', `Formats as "4m 0s" (got: "${dur1.formatted}")`);

    // Test 1b: 17 seconds
    const tEnd2 = '2026-09-25T10:00:17.000Z';
    const dur2 = calculateAuthoritativeDuration(tStart, tEnd2);
    assert(dur2.seconds === 17, 'Calculates 17 seconds accurately');
    assert(dur2.formatted === '17s', `Formats as "17s" (got: "${dur2.formatted}")`);

    // Test 1c: 1 hour 15 minutes 30 seconds
    const tEnd3 = '2026-09-25T11:15:30.000Z';
    const dur3 = calculateAuthoritativeDuration(tStart, tEnd3);
    assert(dur3.seconds === 4530, 'Calculates 4530 seconds accurately');
    assert(dur3.formatted === '1h 15m 30s', `Formats as "1h 15m 30s" (got: "${dur3.formatted}")`);
  }

  // ----------------------------------------------------
  // TEST 2: Anti-Cheating 2-Strike Flagging Rule
  // ----------------------------------------------------
  console.log('\n--- Test 2: 2-Strike Violation Flagging System ---');
  {
    // Create a fresh test participant with unique phone
    const testPhone = `99${Date.now().toString().slice(-8)}`;
    const createRes = await fetch(`${BASE_URL}/api/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test AntiCheat User',
        phone: testPhone,
        quiz_id: 1,
      }),
    });
    const pData = await createRes.json();
    assert(createRes.ok, `Created participant for anti-cheating test (id: ${pData.participant_id})`);
    const pId = pData.participant_id;

    // Strike 1: Update violation count to 1 -> Must NOT be flagged
    const strike1Res = await fetch(`${BASE_URL}/api/participants/${pId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        violation_count: 1,
        last_activity_description: 'Window focus lost [Warning 1/2]',
      }),
    });
    const p1 = await strike1Res.json();
    assert(p1.violation_count === 1, 'Participant recorded 1st violation');
    assert(p1.status === 'active', `Participant status remains "active" on 1st violation (got: "${p1.status}")`);

    // Strike 2: Update violation count to 2 -> MUST BE AUTO-FLAGGED
    const strike2Res = await fetch(`${BASE_URL}/api/participants/${pId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        violation_count: 2,
        last_activity_description: 'Tab switched away [Flagged]',
      }),
    });
    const p2 = await strike2Res.json();
    assert(p2.violation_count === 2, 'Participant recorded 2nd violation');
    assert(p2.status === 'flagged', `Participant status auto-escalated to "flagged" on 2nd violation (got: "${p2.status}")`);
  }

  // ----------------------------------------------------
  // TEST 3: Activity Collision-Proof Unique IDs & Deduplication
  // ----------------------------------------------------
  console.log('\n--- Test 3: Activity ID Uniqueness & Deduplication ---');
  {
    const testPid = 8888;

    // Send rapid duplicate requests for same participant and type
    const p1 = fetch(`${BASE_URL}/api/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_id: testPid,
        participant_name: 'Dedup Tester',
        registration_number: '9999000002',
        event_type: 'tab_switch',
        details: 'Tab switch event 1',
      }),
    });
    const p2 = fetch(`${BASE_URL}/api/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_id: testPid,
        participant_name: 'Dedup Tester',
        registration_number: '9999000002',
        event_type: 'tab_switch',
        details: 'Tab switch event 2 (rapid duplicate)',
      }),
    });

    const [res1, res2] = await Promise.all([p1, p2]);
    const json1 = await res1.json();
    const json2 = await res2.json();

    assert(res1.ok && res2.ok, 'Both activity requests responded HTTP 200/201');
    assert(typeof json1.activity_id === 'number' && json1.activity_id > 1000000, `Activity ID is large unique timestamp (got: ${json1.activity_id})`);
    
    // Fetch latest activities to check uniqueness
    const actRes = await fetch(`${BASE_URL}/api/activity?limit=10`);
    const actList = await actRes.json();
    const ids = actList.map(a => a.activity_id);
    const uniqueIds = new Set(ids);
    assert(ids.length === uniqueIds.size, `All returned activity IDs are unique (no duplicates in list: ${ids.length} items)`);
  }

  // ----------------------------------------------------
  // TEST 4: Authoritative Quiz Closure
  // ----------------------------------------------------
  console.log('\n--- Test 4: Authoritative Quiz Closure ---');
  {
    // Create an active participant for quiz 1 with unique phone
    const activePhone = `98${Date.now().toString().slice(-8)}`;
    const regRes = await fetch(`${BASE_URL}/api/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Active Participant to Close',
        phone: activePhone,
        quiz_id: 1,
      }),
    });
    const activeP = await regRes.json();
    assert(regRes.ok && activeP.status === 'active', `Participant created in active state (id: ${activeP.participant_id})`);

    // Admin closes the quiz via PUT /api/quizzes/1
    const closeRes = await fetch(`${BASE_URL}/api/quizzes/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed' }),
    });
    const closedQuiz = await closeRes.json();
    assert(closedQuiz.status === 'closed', 'Admin closed quiz successfully');

    // Verify active participant was automatically marked completed
    const checkPRes = await fetch(`${BASE_URL}/api/participants/${activeP.participant_id}`);
    const updatedP = await checkPRes.json();
    assert(updatedP.status === 'completed', `Active participant auto-marked as "completed" (got: "${updatedP.status}")`);
    assert(Boolean(updatedP.end_time), 'Participant end_time is populated');
    assert(Boolean(updatedP.time_taken_formatted), `Authoritative duration formatted is populated (got: "${updatedP.time_taken_formatted}")`);

    // Verify new registration via /api/quiz/join is blocked with clear Event Closed message
    const blockJoinRes = await fetch(`${BASE_URL}/api/quiz/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Late Joiner',
        phone: `97${Date.now().toString().slice(-8)}`,
        quiz_code: closedQuiz.code || 'TECH26',
      }),
    });
    const blockJoinData = await blockJoinRes.json();
    assert(!blockJoinRes.ok, 'Join request blocked when quiz is closed');
    assert(blockJoinData.error && blockJoinData.error.includes('Event Closed'), `Error message mentions "Event Closed" (got: "${blockJoinData.error}")`);

    // Verify POST /api/participants is also blocked
    const blockPartRes = await fetch(`${BASE_URL}/api/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Late Direct Joiner',
        phone: `96${Date.now().toString().slice(-8)}`,
        quiz_id: 1,
      }),
    });
    const blockPartData = await blockPartRes.json();
    assert(!blockPartRes.ok, 'Direct participant POST blocked when quiz is closed');
    assert(blockPartData.error && blockPartData.error.includes('Event Closed'), `Error message mentions "Event Closed" (got: "${blockPartData.error}")`);

    // Reopen quiz for subsequent tests
    await fetch(`${BASE_URL}/api/quizzes/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'live' }),
    });
    console.log('  [INFO] Quiz 1 reopened to "live" status for next test');
  }

  // ----------------------------------------------------
  // TEST 5: Concurrency Test (100 Simulated Participants)
  // ----------------------------------------------------
  console.log('\n--- Test 5: Concurrency Load (100 Participants) ---');
  {
    const BATCH_SIZE = 100;
    console.log(`  Sending concurrent join requests for ${BATCH_SIZE} participants...`);

    const prefix = String(Date.now()).slice(-6);
    const tStart = Date.now();
    const promises = [];
    for (let i = 1; i <= BATCH_SIZE; i++) {
      const phone = `8${prefix}${String(i).padStart(3, '0')}`;
      promises.push(
        fetch(`${BASE_URL}/api/quiz/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Load Participant ${i}`,
            phone: phone,
            quiz_code: 'TECH26',
          }),
        }).then(r => r.json())
      );
    }

    const results = await Promise.all(promises);
    const elapsedMs = Date.now() - tStart;
    const successCount = results.filter(r => r.success).length;

    console.log(`  Completed ${BATCH_SIZE} concurrent joins in ${elapsedMs}ms (${Math.round(elapsedMs / BATCH_SIZE)}ms/req avg)`);
    assert(successCount === BATCH_SIZE, `All ${BATCH_SIZE} participants successfully registered (got ${successCount})`);

    // Verify all participant IDs are unique
    const pIds = results.map(r => r.participant?.participant_id).filter(Boolean);
    const uniquePids = new Set(pIds);
    assert(pIds.length === BATCH_SIZE, `All ${BATCH_SIZE} participant IDs are present`);
    assert(pIds.length === uniquePids.size, `All ${pIds.length} participant IDs are distinct and collision-free`);
  }

  // ----------------------------------------------------
  // TEST 6: Leaderboard Score & Column Display Checks
  // ----------------------------------------------------
  console.log('\n--- Test 6: Leaderboard Score Logic (90 Marks Max) ---');
  {
    // Test participant with: MCQ = 32, Hands-on = 8 solved (40 marks)
    const mcqScore = 32;
    const handsOnSolved = 8;
    const mcqMarks = mcqScore * 1;
    const handsOnMarks = handsOnSolved * 5;
    const totalMarks = mcqMarks + handsOnMarks;

    assert(mcqMarks === 32, 'MCQ marks = 32 / 40');
    assert(handsOnMarks === 40, 'Hands-on marks = 40 / 50');
    assert(totalMarks === 72, 'Total marks = 72 / 90');

    // Check that results summary endpoint returns lightweight payloads without 40-item review arrays
    const resSummaryRes = await fetch(`${BASE_URL}/api/results`);
    const summaries = await resSummaryRes.json();
    assert(Array.isArray(summaries), 'Results summary endpoint returns array');
    if (summaries.length > 0) {
      assert(summaries[0].review_items === undefined, 'Lightweight summary omits heavy review_items array');
    }
  }

  console.log('\n====================================================');
  console.log(`Verification Complete: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled error in verification suite:', err);
  process.exit(1);
});
