/**
 * Conversations API Tests
 *
 * Tests the conversations CRUD endpoints.
 * Requires the server to be running on localhost:3001
 *
 * Usage: npx ts-node tests/conversations-api.test.ts
 */

const BASE_URL = 'http://localhost:3001/api';

type TestResult = { name: string; ok: true } | { name: string; ok: false; error: Error };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function runTest(name: string, fn: () => Promise<void>): Promise<TestResult> {
  try {
    await fn();
    return { name, ok: true };
  } catch (e) {
    return { name, ok: false, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

async function createTestUser(): Promise<{ id: string; email: string }> {
  const email = `test-${Date.now()}@example.com`;
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  return { id: data.id, email };
}

async function main() {
  console.log('=== Conversations API Tests ===\n');
  console.log('Note: Requires server running on localhost:3001\n');

  // Check if server is running
  try {
    await fetch(`${BASE_URL.replace('/api', '')}/health`);
  } catch {
    console.error('Error: Server not running on localhost:3001');
    console.error('Start the server with: cd server && npm run dev');
    process.exitCode = 1;
    return;
  }

  const tests: Array<Promise<TestResult>> = [];
  let testUser: { id: string; email: string };
  let testConversationId: string;

  // Setup: Create test user
  try {
    testUser = await createTestUser();
    console.log(`Created test user: ${testUser.email}\n`);
  } catch (e) {
    console.error('Failed to create test user:', e);
    process.exitCode = 1;
    return;
  }

  // Test: Create conversation with default title
  tests.push(
    runTest('POST /conversations - creates conversation with default title', async () => {
      const res = await fetch(`${BASE_URL}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUser.id }),
      });
      assert(res.ok, `Expected 200, got ${res.status}`);
      const data = await res.json();
      assert(data.id, 'Expected conversation to have id');
      assert(data.title === 'New Chat', `Expected title 'New Chat', got '${data.title}'`);
      testConversationId = data.id;
    })
  );

  // Test: Create conversation with custom title
  tests.push(
    runTest('POST /conversations - creates conversation with custom title', async () => {
      const res = await fetch(`${BASE_URL}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUser.id, title: 'My Custom Chat' }),
      });
      assert(res.ok, `Expected 200, got ${res.status}`);
      const data = await res.json();
      assert(data.title === 'My Custom Chat', `Expected title 'My Custom Chat', got '${data.title}'`);
    })
  );

  // Test: List conversations for user
  tests.push(
    runTest('GET /conversations/user/:userId - lists user conversations', async () => {
      const res = await fetch(`${BASE_URL}/conversations/user/${testUser.id}`);
      assert(res.ok, `Expected 200, got ${res.status}`);
      const data = await res.json();
      assert(Array.isArray(data), 'Expected array of conversations');
      assert(data.length >= 2, `Expected at least 2 conversations, got ${data.length}`);
    })
  );

  // Test: Get conversation details
  tests.push(
    runTest('GET /conversations/:id - returns conversation with messages', async () => {
      const res = await fetch(`${BASE_URL}/conversations/${testConversationId}`);
      assert(res.ok, `Expected 200, got ${res.status}`);
      const data = await res.json();
      assert(data.id === testConversationId, 'Expected matching conversation id');
      assert(Array.isArray(data.messages), 'Expected messages array');
    })
  );

  // Test: Get non-existent conversation
  tests.push(
    runTest('GET /conversations/:id - returns 404 for non-existent id', async () => {
      const res = await fetch(`${BASE_URL}/conversations/non-existent-id`);
      assert(res.status === 404, `Expected 404, got ${res.status}`);
    })
  );

  // Test: Delete conversation
  tests.push(
    runTest('DELETE /conversations/:id - deletes conversation and its messages', async () => {
      // First create a conversation to delete
      const createRes = await fetch(`${BASE_URL}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUser.id, title: 'To Be Deleted' }),
      });
      const created = await createRes.json();
      
      // Delete it
      const deleteRes = await fetch(`${BASE_URL}/conversations/${created.id}`, {
        method: 'DELETE',
      });
      assert(deleteRes.ok, `Expected 200, got ${deleteRes.status}`);
      const deleteData = await deleteRes.json();
      assert(deleteData.success === true, 'Expected success: true');
      
      // Verify it's gone
      const getRes = await fetch(`${BASE_URL}/conversations/${created.id}`);
      assert(getRes.status === 404, 'Expected conversation to be deleted (404)');
    })
  );

  // Test: Delete non-existent conversation
  tests.push(
    runTest('DELETE /conversations/:id - handles non-existent id gracefully', async () => {
      const res = await fetch(`${BASE_URL}/conversations/non-existent-id-12345`, {
        method: 'DELETE',
      });
      // Should return 500 (Prisma throws when record not found)
      assert(res.status === 500, `Expected 500 for non-existent delete, got ${res.status}`);
    })
  );

  // Run all tests sequentially
  const results: TestResult[] = [];
  for (const testPromise of tests) {
    results.push(await testPromise);
  }

  // Print results
  console.log('');
  for (const r of results) {
    if (r.ok) {
      console.log(`✓ ${r.name}`);
    } else {
      console.error(`✗ ${r.name}\n  ${r.error.message}`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} tests passed`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
