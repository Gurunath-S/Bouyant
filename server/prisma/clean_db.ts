import { PrismaClient, StallStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanData() {
  console.log('🧹 Cleaning database while preserving Global Tech Expo 2026 & its floor plan layout...');

  // 1. Find Global Tech Expo 2026
  const globalTechExpo = await prisma.exhibition.findFirst({
    where: {
      title: { contains: 'Global Tech Expo', mode: 'insensitive' }
    }
  });

  if (!globalTechExpo) {
    console.error('❌ Global Tech Expo 2026 not found in DB.');
    return;
  }

  console.log(`📌 Found Exhibition to preserve: "${globalTechExpo.title}" (${globalTechExpo.id})`);

  // 2. Delete all transactional tables in dependency order
  console.log('🗑️  Deleting booking stalls...');
  await prisma.bookingStall.deleteMany({});

  console.log('🗑️  Deleting payments...');
  await prisma.payment.deleteMany({});

  console.log('🗑️  Deleting invoices...');
  await prisma.invoice.deleteMany({});

  console.log('🗑️  Deleting bookings...');
  await prisma.booking.deleteMany({});

  console.log('🗑️  Deleting notifications...');
  await prisma.notification.deleteMany({});

  // 3. Delete other exhibitions (keep only Global Tech Expo 2026)
  console.log('🗑️  Deleting other exhibitions...');
  const deletedExpos = await prisma.exhibition.deleteMany({
    where: {
      id: { not: globalTechExpo.id }
    }
  });
  console.log(`   Removed ${deletedExpos.count} other exhibitions.`);

  // 4. Delete client users & companies
  console.log('🗑️  Unlinking users from companies...');
  await prisma.user.updateMany({
    data: { companyId: null }
  });

  console.log('🗑️  Deleting client exhibitor users (keeping Admin/SuperAdmin/Staff)...');
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      role: 'CLIENT'
    }
  });
  console.log(`   Removed ${deletedUsers.count} client accounts.`);

  console.log('🗑️  Deleting exhibitor companies...');
  const deletedCompanies = await prisma.company.deleteMany({});
  console.log(`   Removed ${deletedCompanies.count} company profiles.`);

  // 5. Reset all stalls for Global Tech Expo 2026 back to AVAILABLE
  console.log('🔄 Resetting all floor plan stalls to AVAILABLE status...');
  const floorPlans = await prisma.floorPlan.findMany({
    where: { exhibitionId: globalTechExpo.id },
    select: { id: true }
  });

  const fpIds = floorPlans.map((fp) => fp.id);

  const resetStalls = await prisma.stall.updateMany({
    where: {
      floorPlanId: { in: fpIds }
    },
    data: {
      status: StallStatus.AVAILABLE
    }
  });

  console.log(`✅ Successfully reset ${resetStalls.count} stalls in Global Tech Expo 2026 to AVAILABLE.`);
  console.log('🎉 Cleanup complete! Database is clean and ready with only Global Tech Expo 2026 & its floor plan.');
}

cleanData()
  .catch((e) => {
    console.error('❌ Failed to clean database:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
