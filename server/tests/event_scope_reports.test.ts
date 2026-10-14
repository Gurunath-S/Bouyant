import http from 'http';
import { prisma } from '../src/config/db.js';
import { generateTokens } from '../src/utils/jwt.js';

function requestJson(url: string, token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    http.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Testing Event Scope filter on Business Reports endpoints...');

  // 1. Get an admin user
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!admin) {
    throw new Error('No admin user found in database');
  }

  const token = generateTokens({
    userId: admin.id,
    email: admin.email,
    role: admin.role,
  }).accessToken;

  // 2. Fetch combined overview
  const combinedRes = await requestJson('http://localhost:5000/api/v1/reports/overview', token);
  console.log('Combined overview status:', combinedRes.success);
  console.log('Combined total revenue:', combinedRes.data?.totalRevenue);
  console.log('Combined total exhibitions:', combinedRes.data?.totalExhibitions);

  // 3. Fetch an exhibition with bookings and stalls
  const exhibition = await prisma.exhibition.findFirst({
    include: {
      bookings: true,
      floorPlans: { include: { stalls: true } },
    },
  });

  if (!exhibition) {
    throw new Error('No exhibition found in database');
  }

  console.log(`\nTesting scoped reports for Exhibition: "${exhibition.title}" (${exhibition.id})`);

  // 4. Scoped Overview
  const scopedOverviewRes = await requestJson(
    `http://localhost:5000/api/v1/reports/overview?exhibitionId=${exhibition.id}`,
    token
  );
  console.log('Scoped overview success:', scopedOverviewRes.success);
  const scopedData = scopedOverviewRes.data;
  console.log('Scoped eventScoped flag:', scopedData?.eventScoped);
  console.log('Scoped totalExhibitions:', scopedData?.totalExhibitions);
  console.log('Scoped totalRevenue:', scopedData?.totalRevenue);
  console.log('Scoped confirmedBookings:', scopedData?.confirmedBookings);
  console.log('Scoped occupancyRate:', scopedData?.occupancyRate);
  console.log('Scoped totalStalls:', scopedData?.totalStalls);

  if (scopedData?.totalExhibitions !== 1) {
    throw new Error(`Expected totalExhibitions to be 1, got ${scopedData?.totalExhibitions}`);
  }

  // 5. Scoped Occupancy
  const scopedOccupancyRes = await requestJson(
    `http://localhost:5000/api/v1/reports/occupancy?exhibitionId=${exhibition.id}`,
    token
  );
  console.log('\nScoped occupancy success:', scopedOccupancyRes.success);
  const occData = scopedOccupancyRes.data;
  console.log('Scoped occupancy totalStalls:', occData?.totalStalls);
  console.log('Scoped occupancy totalBooked:', occData?.totalBooked);
  console.log('Scoped occupancy totalAvailable:', occData?.totalAvailable);

  const allExhibitionStalls = exhibition.floorPlans.flatMap((fp) => fp.stalls);
  if (allExhibitionStalls.length > 0 && occData?.totalStalls !== allExhibitionStalls.length) {
    throw new Error(
      `Expected occupancy stalls to match exhibition stalls (${allExhibitionStalls.length}), got ${occData?.totalStalls}`
    );
  }

  console.log('\n🎉 ALL EVENT SCOPE FILTER TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
