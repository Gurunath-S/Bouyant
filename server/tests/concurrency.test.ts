import { StallsService } from '../src/modules/stalls/stalls.service.js';
import { prisma } from '../src/config/db.js';

async function testConcurrency() {
  console.log('🧪 Starting Atomic Stall Hold Concurrency Test...');

  // Find an available stall
  const stall = await prisma.stall.findFirst({
    where: { status: 'AVAILABLE' },
  });

  if (!stall) {
    console.log('❌ No available stall found for testing.');
    return;
  }

  console.log(`📌 Target Stall: ${stall.stallNumber} (ID: ${stall.id})`);

  const userA = 'user_simulated_client_A';
  const userB = 'user_simulated_client_B';

  // Fire 2 simultaneous hold requests
  console.log('🚀 Triggering 2 simultaneous hold requests for the same stall...');

  const results = await Promise.allSettled([
    StallsService.holdStall(stall.id, userA),
    StallsService.holdStall(stall.id, userB),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  console.log(`✅ Successful Holds: ${fulfilled.length}`);
  console.log(`🛡️ Rejected/Blocked Holds: ${rejected.length}`);

  if (fulfilled.length === 1 && rejected.length === 1) {
    console.log('🎉 ATOMIC CONCURRENCY TEST PASSED! Exactly ONE client secured the hold.');
  } else {
    console.warn('⚠️ Concurrency result unexpected:', { fulfilled, rejected });
  }

  // Cleanup reset status back to AVAILABLE
  await prisma.stall.update({
    where: { id: stall.id },
    data: { status: 'AVAILABLE', heldUntil: null, heldByUserId: null },
  });

  await prisma.$disconnect();
}

testConcurrency().catch(console.error);
