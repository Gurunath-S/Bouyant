import { PrismaClient } from '@prisma/client';

const LOCAL_DATABASE_URL =
  'postgresql://guru:password123@localhost/buoyant_media?host=/tmp&schema=public';
const ONLINE_DATABASE_URL =
  'postgresql://postgres.crulsbwwcamwyjtxoxqy:parthiban007@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?schema=public';

const localPrisma = new PrismaClient({ datasourceUrl: LOCAL_DATABASE_URL });
const onlinePrisma = new PrismaClient({ datasourceUrl: ONLINE_DATABASE_URL });

async function migrate() {
  console.log('🔄 Starting migration of Global Tech Expo 2026 from local DB to online DB...');

  try {
    // 1. Fetch exhibition and related data from local DB
    const localExpo = await localPrisma.exhibition.findFirst({
      where: { slug: 'global-tech-expo-2026' },
      include: {
        floorPlans: {
          include: {
            stalls: true,
          },
        },
      },
    });

    if (!localExpo) {
      throw new Error('❌ Exhibition "Global Tech Expo 2026" not found in local database!');
    }

    console.log(`📦 Found Local Exhibition: "${localExpo.title}" (${localExpo.slug})`);
    console.log(`   - Total FloorPlans: ${localExpo.floorPlans.length}`);
    const totalStallsCount = localExpo.floorPlans.reduce((acc, fp) => acc + fp.stalls.length, 0);
    console.log(`   - Total Stalls across floor plans: ${totalStallsCount}`);

    // 2. Insert or update Exhibition in online DB
    const onlineExpo = await onlinePrisma.exhibition.upsert({
      where: { slug: localExpo.slug },
      update: {
        title: localExpo.title,
        description: localExpo.description,
        venue: localExpo.venue,
        city: localExpo.city,
        startDate: localExpo.startDate,
        endDate: localExpo.endDate,
        status: localExpo.status,
        bannerUrl: localExpo.bannerUrl,
        totalStalls: localExpo.totalStalls,
        edition: localExpo.edition,
        eventCode: localExpo.eventCode,
        spcode: localExpo.spcode,
      },
      create: {
        id: localExpo.id,
        title: localExpo.title,
        slug: localExpo.slug,
        description: localExpo.description,
        venue: localExpo.venue,
        city: localExpo.city,
        startDate: localExpo.startDate,
        endDate: localExpo.endDate,
        status: localExpo.status,
        bannerUrl: localExpo.bannerUrl,
        totalStalls: localExpo.totalStalls,
        edition: localExpo.edition,
        eventCode: localExpo.eventCode,
        spcode: localExpo.spcode,
      },
    });

    console.log(`✅ Upserted Exhibition in Online DB: ${onlineExpo.title} (ID: ${onlineExpo.id})`);

    // 3. Process FloorPlans and Stalls
    for (const fp of localExpo.floorPlans) {
      console.log(`   🏗️ Syncing FloorPlan: "${fp.name}"...`);

      const onlineFloorPlan = await onlinePrisma.floorPlan.upsert({
        where: { id: fp.id },
        update: {
          exhibitionId: onlineExpo.id,
          name: fp.name,
          width: fp.width,
          height: fp.height,
          backgroundUrl: fp.backgroundUrl,
          gridColumns: fp.gridColumns,
          gridRows: fp.gridRows,
          isPublished: fp.isPublished,
        },
        create: {
          id: fp.id,
          exhibitionId: onlineExpo.id,
          name: fp.name,
          width: fp.width,
          height: fp.height,
          backgroundUrl: fp.backgroundUrl,
          gridColumns: fp.gridColumns,
          gridRows: fp.gridRows,
          isPublished: fp.isPublished,
        },
      });

      console.log(`   ✅ FloorPlan upserted: ${onlineFloorPlan.id}`);
      console.log(`   📦 Upserting ${fp.stalls.length} stalls...`);

      // Batch insert stalls with createMany / upsert
      // Prisma createMany is fast and supported in PostgreSQL
      let stallsCreated = 0;
      for (const stall of fp.stalls) {
        await onlinePrisma.stall.upsert({
          where: {
            floorPlanId_stallNumber: {
              floorPlanId: onlineFloorPlan.id,
              stallNumber: stall.stallNumber,
            },
          },
          update: {
            name: stall.name,
            category: stall.category,
            price: stall.price,
            areaSqFt: stall.areaSqFt,
            width: stall.width,
            height: stall.height,
            xPosition: stall.xPosition,
            yPosition: stall.yPosition,
            status: stall.status,
            heldUntil: null,
            heldByUserId: null,
          },
          create: {
            id: stall.id,
            floorPlanId: onlineFloorPlan.id,
            stallNumber: stall.stallNumber,
            name: stall.name,
            category: stall.category,
            price: stall.price,
            areaSqFt: stall.areaSqFt,
            width: stall.width,
            height: stall.height,
            xPosition: stall.xPosition,
            yPosition: stall.yPosition,
            status: stall.status,
            heldUntil: null,
            heldByUserId: null,
          },
        });
        stallsCreated++;
      }

      console.log(`   🎉 Successfully synced ${stallsCreated} stalls for floor plan "${fp.name}"`);
    }

    // 4. Verification in Online DB
    const verifyExpo = await onlinePrisma.exhibition.findUnique({
      where: { slug: 'global-tech-expo-2026' },
      include: {
        floorPlans: {
          include: {
            stalls: true,
          },
        },
      },
    });

    console.log('----------------------------------------------------');
    console.log('🎯 Online DB Verification:');
    console.log(`   Exhibition Title: ${verifyExpo?.title}`);
    console.log(`   Venue: ${verifyExpo?.venue}, ${verifyExpo?.city}`);
    console.log(`   FloorPlans count: ${verifyExpo?.floorPlans.length}`);
    if (verifyExpo?.floorPlans.length) {
      console.log(`   FloorPlan Name: ${verifyExpo.floorPlans[0].name}`);
      console.log(`   Total Stalls in Online DB: ${verifyExpo.floorPlans[0].stalls.length}`);
    }
    console.log('----------------------------------------------------');
    console.log('🚀 Migration Completed Successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await localPrisma.$disconnect();
    await onlinePrisma.$disconnect();
  }
}

migrate();
