/**
 * API Test Script
 * Tests the complete job workflow through all status transitions
 * 
 * Run: npm run test
 * Prerequisites: Server must be running, database seeded
 */

const BASE_URL = 'http://localhost:5000/api';

// Store tokens and IDs
const tokens = {};
let jobId = null;
let technicianId = null;

async function request(method, endpoint, body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

function log(message, data = null) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(message);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log('🧪 Starting API Tests...\n');

  // 1. Login as all users
  log('1. Logging in users...');
  
  const users = [
    { email: 'admin@hosanna.com', password: 'admin123', role: 'ADMIN' },
    { email: 'manager@hosanna.com', password: 'manager123', role: 'OFFICE_MANAGER' },
    { email: 'tech1@hosanna.com', password: 'tech123', role: 'TECHNICIAN' },
  ];

  for (const user of users) {
    const { status, data } = await request('POST', '/auth/login', {
      email: user.email,
      password: user.password,
    });
    assert(status === 200, `Login successful for ${user.role}`);
    tokens[user.role] = data.data.token;
    if (user.role === 'TECHNICIAN') {
      technicianId = data.data.user._id;
    }
  }

  // 2. Create job (ADMIN only)
  log('2. Creating job (ADMIN)...');
  {
    const { status, data } = await request(
      'POST',
      '/jobs',
      {
        title: 'Test HVAC Repair',
        description: 'AC unit not cooling properly',
        customerName: 'John Doe',
        customerPhone: '555-0123',
        customerEmail: 'john@example.com',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '90210',
        },
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        estimatedCost: 250,
      },
      tokens.ADMIN
    );
    assert(status === 201, 'Job created successfully');
    assert(data.data.status === 'TENTATIVE', 'Initial status is TENTATIVE');
    jobId = data.data._id;
    log('Created job:', data.data);
  }

  // 3. Try invalid: Technician creates job (should fail)
  log('3. Testing: Technician cannot create job...');
  {
    const { status, data } = await request(
      'POST',
      '/jobs',
      { title: 'Unauthorized Job', customerName: 'Test' },
      tokens.TECHNICIAN
    );
    assert(status === 403, 'Technician blocked from creating job');
  }

  // 4. Try invalid transition: Skip to ASSIGNED (should fail)
  log('4. Testing: Cannot skip CONFIRMED status...');
  {
    const { status, data } = await request(
      'PATCH',
      `/jobs/${jobId}/status`,
      { status: 'ASSIGNED' },
      tokens.ADMIN
    );
    assert(status === 400, 'Invalid transition rejected');
    console.log('  Error message:', data.error);
  }

  // 5. Confirm job (ADMIN)
  log('5. Confirming job (ADMIN)...');
  {
    const { status, data } = await request(
      'PATCH',
      `/jobs/${jobId}/status`,
      { status: 'CONFIRMED', notes: 'Customer confirmed appointment' },
      tokens.ADMIN
    );
    assert(status === 200, 'Job confirmed');
    assert(data.data.status === 'CONFIRMED', 'Status is CONFIRMED');
    assert(data.data.statusHistory.length === 2, 'History has 2 entries');
  }

  // 6. Try invalid: Technician confirms job (should fail)
  log('6. Testing: Technician cannot confirm job...');
  {
    // Create another job first
    const createRes = await request(
      'POST',
      '/jobs',
      { title: 'Another Job', customerName: 'Test' },
      tokens.ADMIN
    );
    const testJobId = createRes.data.data._id;
    
    const { status } = await request(
      'PATCH',
      `/jobs/${testJobId}/status`,
      { status: 'CONFIRMED' },
      tokens.TECHNICIAN
    );
    assert(status === 400, 'Technician blocked from confirming');
  }

  // 7. Assign technician (ADMIN)
  log('7. Assigning technician (ADMIN)...');
  {
    const { status, data } = await request(
      'PATCH',
      `/jobs/${jobId}/assign`,
      { technicianId, notes: 'Assigned to John Tech' },
      tokens.ADMIN
    );
    assert(status === 200, 'Technician assigned');
    assert(data.data.status === 'ASSIGNED', 'Status is ASSIGNED');
    assert(data.data.assignedTechnician._id === technicianId, 'Correct technician assigned');
  }

  // 8. Start job (TECHNICIAN)
  log('8. Starting job (TECHNICIAN)...');
  {
    const { status, data } = await request(
      'PATCH',
      `/jobs/${jobId}/status`,
      { status: 'IN_PROGRESS', notes: 'Arrived on site' },
      tokens.TECHNICIAN
    );
    assert(status === 200, 'Job started');
    assert(data.data.status === 'IN_PROGRESS', 'Status is IN_PROGRESS');
  }

  // 9. Try invalid: Admin starts job (should fail)
  log('9. Testing: Admin cannot start jobs...');
  {
    // Need another assigned job
    const job2 = await request(
      'POST',
      '/jobs',
      { title: 'Job 2', customerName: 'Test' },
      tokens.ADMIN
    );
    await request(
      'PATCH',
      `/jobs/${job2.data.data._id}/status`,
      { status: 'CONFIRMED' },
      tokens.ADMIN
    );
    await request(
      'PATCH',
      `/jobs/${job2.data.data._id}/assign`,
      { technicianId },
      tokens.ADMIN
    );
    
    const { status } = await request(
      'PATCH',
      `/jobs/${job2.data.data._id}/status`,
      { status: 'IN_PROGRESS' },
      tokens.ADMIN
    );
    assert(status === 400, 'Admin blocked from starting job');
  }

  // 10. Complete job (TECHNICIAN)
  log('10. Completing job (TECHNICIAN)...');
  {
    const { status, data } = await request(
      'PATCH',
      `/jobs/${jobId}/status`,
      { status: 'COMPLETED', notes: 'Replaced compressor, tested cooling' },
      tokens.TECHNICIAN
    );
    assert(status === 200, 'Job completed');
    assert(data.data.status === 'COMPLETED', 'Status is COMPLETED');
    assert(data.data.completedAt !== null, 'completedAt timestamp set');
  }

  // 11. Try invalid: Technician bills job (should fail)
  log('11. Testing: Technician cannot bill jobs...');
  {
    const { status } = await request(
      'PATCH',
      `/jobs/${jobId}/status`,
      { status: 'BILLED' },
      tokens.TECHNICIAN
    );
    assert(status === 400, 'Technician blocked from billing');
  }

  // 12. Bill job (OFFICE_MANAGER)
  log('12. Billing job (OFFICE_MANAGER)...');
  {
    const { status, data } = await request(
      'PATCH',
      `/jobs/${jobId}/status`,
      { status: 'BILLED', notes: 'Invoice #12345 sent to customer' },
      tokens.OFFICE_MANAGER
    );
    assert(status === 200, 'Job billed');
    assert(data.data.status === 'BILLED', 'Status is BILLED');
    assert(data.data.billedAt !== null, 'billedAt timestamp set');
  }

  // 13. Verify final status history
  log('13. Verifying complete status history...');
  {
    const { status, data } = await request(
      'GET',
      `/jobs/${jobId}/history`,
      null,
      tokens.ADMIN
    );
    assert(status === 200, 'History retrieved');
    assert(data.data.history.length === 6, 'All 6 transitions recorded');
    
    const statuses = data.data.history.map(h => h.toStatus);
    assert(
      JSON.stringify(statuses) === 
      JSON.stringify(['TENTATIVE', 'CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'BILLED']),
      'Status progression is correct'
    );
    log('Complete history:', data.data.history);
  }

  // 14. Try invalid: Transition from terminal state
  log('14. Testing: Cannot transition from BILLED (terminal)...');
  {
    const { status, data } = await request(
      'PATCH',
      `/jobs/${jobId}/status`,
      { status: 'COMPLETED' },
      tokens.ADMIN
    );
    assert(status === 400, 'Terminal state transition blocked');
  }

  // 15. Get transition info
  log('15. Getting state machine info...');
  {
    const { status, data } = await request(
      'GET',
      '/jobs/transitions/info',
      null,
      tokens.ADMIN
    );
    assert(status === 200, 'Transition info retrieved');
    log('State machine:', data.data);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 ALL TESTS PASSED!');
  console.log('='.repeat(60));
}

runTests().catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});
