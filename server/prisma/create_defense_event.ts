import 'dotenv/config';
import { PrismaClient, ExhibitionStatus, StallCategory, StallStatus, UserRole } from '@prisma/client';

async function seedEventToDatabase(databaseUrl: string, dbName: string) {
  console.log(`\n================================================================`);
  console.log(`🚀 CREATING EVENT IN DATABASE: ${dbName}`);
  console.log(`================================================================`);

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    // 1. Find or verify an admin user to attach as createdByUserId
    const adminUser = await prisma.user.findFirst({
      where: {
        role: { in: [UserRole.SUPERADMIN, UserRole.ADMIN] },
      },
    });

    const eventData = {
      title: 'National Defense & Aerospace Manufacturing Summit 2027',
      slug: 'defense-aerospace-summit-2027',
      description:
        'Premier national summit and trade exhibition showcasing advanced aerospace engineering, defense manufacturing, indigenous avionics, radar systems, and military tech innovations.',
      venue: 'Hitex Exhibition Centre (Trade Fair Hall 1)',
      city: 'Hyderabad, TS',
      startDate: new Date('2027-02-18T09:00:00Z'),
      endDate: new Date('2027-02-21T18:00:00Z'),
      bookingEndDate: new Date('2027-02-10T23:59:59Z'),
      status: ExhibitionStatus.PUBLISHED,
      bannerUrl: 'https://images.unsplash.com/photo-1517976487502-5f7946f10157?w=1200',
      totalStalls: 14,
      edition: '1',
      eventCode: 'DA-01',
      spcode: 'DA01',
      notificationEmails: 'admin@buoyantmedia.com',
      createdByUserId: adminUser?.id || null,
    };

    // 2. Upsert Exhibition
    const existingExpo = await prisma.exhibition.findFirst({
      where: {
        OR: [
          { slug: eventData.slug },
          {
            edition: eventData.edition,
            eventCode: eventData.eventCode,
          },
        ],
      },
    });

    let exhibition;
    if (existingExpo) {
      exhibition = await prisma.exhibition.update({
        where: { id: existingExpo.id },
        data: eventData,
      });
      console.log(`✅ Updated existing Exhibition: ${exhibition.title} (${exhibition.id})`);
    } else {
      exhibition = await prisma.exhibition.create({
        data: eventData,
      });
      console.log(`✅ Created new Exhibition: ${exhibition.title} (${exhibition.id})`);
    }

    // 3. Find or Create Floor Plan
    let floorPlan = await prisma.floorPlan.findFirst({
      where: { exhibitionId: exhibition.id },
    });

    if (!floorPlan) {
      floorPlan = await prisma.floorPlan.create({
        data: {
          exhibitionId: exhibition.id,
          name: `Main Aerospace & Defence Pavilion - Hall 1`,
          width: 1200,
          height: 800,
          gridColumns: 20,
          gridRows: 15,
          isPublished: true,
        },
      });
      console.log(`🏛️ Created Floor Plan: ${floorPlan.name}`);
    } else {
      floorPlan = await prisma.floorPlan.update({
        where: { id: floorPlan.id },
        data: { isPublished: true },
      });
      console.log(`🏛️ Verified Floor Plan: ${floorPlan.name}`);
    }

    // 4. Stalls Template (14 interactive stalls across categories)
    const stallsTemplate = [
      // Standard Stalls (A-Row)
      { stallNumber: 'A-101', category: StallCategory.STANDARD, price: 50000, areaSqFt: 100, width: 100, height: 100, xPosition: 50, yPosition: 50 },
      { stallNumber: 'A-102', category: StallCategory.STANDARD, price: 50000, areaSqFt: 100, width: 100, height: 100, xPosition: 180, yPosition: 50 },
      { stallNumber: 'A-103', category: StallCategory.STANDARD, price: 50000, areaSqFt: 100, width: 100, height: 100, xPosition: 310, yPosition: 50 },
      { stallNumber: 'A-104', category: StallCategory.STANDARD, price: 50000, areaSqFt: 100, width: 100, height: 100, xPosition: 440, yPosition: 50 },
      // Premium Stalls (B-Row)
      { stallNumber: 'B-201', category: StallCategory.PREMIUM, price: 75000, areaSqFt: 150, width: 100, height: 100, xPosition: 50, yPosition: 220 },
      { stallNumber: 'B-202', category: StallCategory.PREMIUM, price: 75000, areaSqFt: 150, width: 100, height: 100, xPosition: 220, yPosition: 220 },
      { stallNumber: 'B-203', category: StallCategory.PREMIUM, price: 75000, areaSqFt: 150, width: 100, height: 100, xPosition: 390, yPosition: 220 },
      { stallNumber: 'B-204', category: StallCategory.PREMIUM, price: 75000, areaSqFt: 150, width: 100, height: 100, xPosition: 560, yPosition: 220 },
      // Corner Stalls (C-Row)
      { stallNumber: 'C-301', category: StallCategory.CORNER, price: 90000, areaSqFt: 180, width: 100, height: 100, xPosition: 50, yPosition: 400 },
      { stallNumber: 'C-302', category: StallCategory.CORNER, price: 90000, areaSqFt: 180, width: 100, height: 100, xPosition: 250, yPosition: 400 },
      { stallNumber: 'C-303', category: StallCategory.CORNER, price: 90000, areaSqFt: 180, width: 100, height: 100, xPosition: 450, yPosition: 400 },
      // VIP Island Stalls
      { stallNumber: 'VIP-01', category: StallCategory.ISLAND, price: 150000, areaSqFt: 300, width: 100, height: 100, xPosition: 750, yPosition: 50 },
      { stallNumber: 'VIP-02', category: StallCategory.ISLAND, price: 150000, areaSqFt: 300, width: 100, height: 100, xPosition: 750, yPosition: 280 },
      { stallNumber: 'VIP-03', category: StallCategory.ISLAND, price: 150000, areaSqFt: 300, width: 100, height: 100, xPosition: 750, yPosition: 510 },
    ];

    let createdStallCount = 0;
    for (const s of stallsTemplate) {
      await prisma.stall.upsert({
        where: {
          floorPlanId_stallNumber: {
            floorPlanId: floorPlan.id,
            stallNumber: s.stallNumber,
          },
        },
        update: {
          category: s.category,
          price: s.price,
          areaSqFt: s.areaSqFt,
          width: s.width,
          height: s.height,
          xPosition: s.xPosition,
          yPosition: s.yPosition,
        },
        create: {
          floorPlanId: floorPlan.id,
          stallNumber: s.stallNumber,
          category: s.category,
          price: s.price,
          areaSqFt: s.areaSqFt,
          width: s.width,
          height: s.height,
          xPosition: s.xPosition,
          yPosition: s.yPosition,
          status: StallStatus.AVAILABLE,
          heldByUserId: null,
          heldUntil: null,
        },
      });
      createdStallCount++;
    }

    console.log(`🎯 Seeded ${createdStallCount} Stalls (All 100% Available) for Floor Plan`);
    console.log(`✨ Event "${eventData.title}" is ready and live!`);
    console.log(`🔗 URL: /exhibitions/${eventData.slug}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const testDevUrl =
    'postgresql://postgres.crulsbwwcamwyjtxoxqy:parthiban007@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?schema=public';
  const mainDevUrl =
    'postgresql://postgres.wtuhaoqbntrashcdkrve:parthiban007@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';

  // Seed to test-dev
  await seedEventToDatabase(testDevUrl, 'TEST-DEV (crulsbwwcamwyjtxoxqy)');

  // Seed to main-dev
  await seedEventToDatabase(mainDevUrl, 'MAIN-DEV (wtuhaoqbntrashcdkrve)');

  console.log('\n================================================================');
  console.log('🎉 SUCCESSFULLY SEEDED EVENT TO BOTH TEST-DEV AND MAIN-DEV DATABASES');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('❌ Failed to create event:', err);
  process.exit(1);
});
