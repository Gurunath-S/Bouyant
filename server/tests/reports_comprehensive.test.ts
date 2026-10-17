import { prisma } from '../src/config/db.js';
import { ReportsService } from '../src/modules/reports/reports.service.js';

async function runComprehensiveReportsTests() {
  console.log('--- Starting Comprehensive Platform Reports Test Suite ---');
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`❌ FAIL: ${msg}`);
      testsFailed++;
      throw new Error(msg);
    } else {
      console.log(`✅ PASS: ${msg}`);
      testsPassed++;
    }
  }

  // 1. Get or verify test users
  const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPERADMIN' } });
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const staff = await prisma.user.findFirst({ where: { role: 'STAFF' } });
  const clientUser = await prisma.user.findFirst({ where: { role: 'CLIENT', companyId: { not: null } } });

  assert(!!superAdmin, 'SuperAdmin user exists');
  assert(!!admin, 'Admin user exists');
  assert(!!staff, 'Staff user exists');
  assert(!!clientUser && !!clientUser.companyId, 'Client user with company exists');

  // 2. Find or create an exhibition for testing
  let testExhibition = await prisma.exhibition.findFirst({
    where: { status: 'PUBLISHED' },
    include: { floorPlans: { include: { stalls: true } } },
  });

  if (!testExhibition) {
    testExhibition = await prisma.exhibition.create({
      data: {
        title: 'Reports Test Expo 2026',
        slug: `reports-test-expo-${Date.now()}`,
        description: 'Test Exhibition for Reports Center',
        venue: 'Exhibition Hall 1',
        city: 'Bengaluru',
        startDate: new Date('2026-11-01T00:00:00Z'),
        endDate: new Date('2026-11-05T00:00:00Z'),
        status: 'PUBLISHED',
        totalStalls: 10,
        edition: '01',
        eventCode: 'RPT',
        spcode: 'SP01',
        createdByUserId: admin!.id,
      },
      include: { floorPlans: { include: { stalls: true } } },
    });
  }

  // Ensure floor plan and stalls exist
  let floorPlan = testExhibition.floorPlans[0];
  if (!floorPlan) {
    floorPlan = await prisma.floorPlan.create({
      data: {
        exhibitionId: testExhibition.id,
        name: 'Main Arena',
        isPublished: true,
      },
      include: { stalls: true },
    });
  }

  const ts = Date.now();
  // Create 2 test stalls
  const stall1 = await prisma.stall.create({
    data: {
      floorPlanId: floorPlan.id,
      stallNumber: `RPT-S1-${ts % 100000}`,
      price: 40000,
      areaSqFt: 100,
      category: 'STANDARD',
      status: 'AVAILABLE',
    },
  });

  const stall2 = await prisma.stall.create({
    data: {
      floorPlanId: floorPlan.id,
      stallNumber: `RPT-S2-${ts % 100000}`,
      price: 60000,
      areaSqFt: 150,
      category: 'PREMIUM',
      status: 'AVAILABLE',
    },
  });

  // Create test bookings:
  // Booking A: Confirmed, Partially Paid (total 47,200 with 18% GST: base 40,000, tax 7,200, paid 20,000, balance 27,200)
  const bookingA = await prisma.booking.create({
    data: {
      bookingReference: `BKG-RPT-A-${ts % 100000}`,
      companyId: clientUser!.companyId!,
      exhibitionId: testExhibition.id,
      status: 'CONFIRMED',
      totalAmount: 40000,
      taxAmount: 7200,
      grandTotal: 47200,
      paidAmount: 20000,
      balanceAmount: 27200,
      paymentStatus: 'PARTIALLY_PAID',
      stalls: { create: [{ stallId: stall1.id, price: 40000 }] },
    },
  });

  // Create successful payment for Booking A
  const paymentA = await prisma.payment.create({
    data: {
      paymentReference: `PAY-RPT-A-${ts % 100000}`,
      bookingId: bookingA.id,
      amount: 20000,
      status: 'SUCCESS',
      provider: 'RAZORPAY',
      paymentMethod: 'UPI_RAZORPAY',
      paidAt: new Date(),
    },
  });

  // Create invoice for Booking A
  const invoiceA = await prisma.invoice.create({
    data: {
      invoiceNumber: `INV-RPT-A-${ts % 100000}`,
      bookingId: bookingA.id,
      paymentId: paymentA.id,
      companyId: clientUser!.companyId!,
      totalAmount: 40000,
      taxAmount: 7200,
      grandTotal: 47200,
      status: 'ISSUED',
    },
  });

  // Booking B: Cancelled (should be excluded from active booking value and balance)
  const bookingB = await prisma.booking.create({
    data: {
      bookingReference: `BKG-RPT-B-${ts % 100000}`,
      companyId: clientUser!.companyId!,
      exhibitionId: testExhibition.id,
      status: 'CANCELLED',
      totalAmount: 60000,
      taxAmount: 10800,
      grandTotal: 70800,
      paidAmount: 0,
      balanceAmount: 70800,
      paymentStatus: 'UNPAID',
      stalls: { create: [{ stallId: stall2.id, price: 60000 }] },
    },
  });

  // Update stall1 to BOOKED_CONFIRMED
  await prisma.stall.update({
    where: { id: stall1.id },
    data: { status: 'BOOKED_CONFIRMED' },
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: Scoped Overview with Accurate Financial Separation
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Event-Scoped Overview Report ---');
    const scopedOverview = await ReportsService.getOverview('ADMIN', admin!.id, {
      exhibitionId: testExhibition.id,
    });

    assert(scopedOverview.eventScoped === true, 'Overview is marked as event-scoped');
    assert(scopedOverview.exhibition?.id === testExhibition.id, 'Overview scopes to test exhibition');
    assert(Number(scopedOverview.totalBookingValue) >= 47200, 'Total booking value includes Booking A');
    assert(Number(scopedOverview.actualPaymentsReceived) >= 20000, 'Actual payments received includes ₹20,000 payment');
    assert(Number(scopedOverview.outstandingBalance) >= 27200, 'Outstanding balance reflects remaining ₹27,200');
    assert(scopedOverview.confirmedBookings >= 1, 'Confirmed bookings count is accurate');

    // Financial breakdown object
    assert(!!scopedOverview.financialSummary, 'Financial summary object is present');
    assert(scopedOverview.financialSummary.paymentStatusBreakdown?.partiallyPaid?.count >= 1, 'Partially paid breakdown is populated');

    // -------------------------------------------------------------
    // TEST 2: Platform-Wide Overview for SuperAdmin
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Platform-Wide Overview Report ---');
    const platformOverview = await ReportsService.getOverview('SUPERADMIN', superAdmin!.id, {
      exhibitionId: 'ALL',
    });

    assert(platformOverview.eventScoped === false, 'Platform overview is not event-scoped');
    assert(Number(platformOverview.totalExhibitions) >= 1, 'Total exhibitions count is reported');
    assert(Number(platformOverview.totalBookingValue) >= Number(scopedOverview.totalBookingValue), 'Platform booking value >= scoped value');
    assert(Array.isArray(platformOverview.dailyTrends), 'Daily trend time-series data is provided');

    // -------------------------------------------------------------
    // TEST 3: Date Filtering
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Date Range Filtering ---');
    const pastYearOverview = await ReportsService.getOverview('ADMIN', admin!.id, {
      exhibitionId: testExhibition.id,
      startDate: '2020-01-01',
      endDate: '2020-01-02',
    });
    assert(pastYearOverview.totalBookings === 0, 'No bookings in 2020 date filter');
    assert(Number(pastYearOverview.totalBookingValue) === 0, 'Zero booking value in 2020 date filter');

    // -------------------------------------------------------------
    // TEST 4: Stall Occupancy Report
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Stall Occupancy Breakdown ---');
    const occReport = await ReportsService.getStallOccupancyReport('ADMIN', admin!.id, {
      exhibitionId: testExhibition.id,
    });
    assert(occReport.totalStalls >= 2, 'Stalls occupancy includes test stalls');
    assert(occReport.totalBooked >= 1, 'At least 1 stall is confirmed booked');
    assert(!!occReport.categoryBreakdown?.STANDARD, 'Category breakdown contains STANDARD category');
    assert(occReport.categoryBreakdown.STANDARD.booked >= 1, 'STANDARD stall is counted as booked');

    // -------------------------------------------------------------
    // TEST 5: Detailed Paginated Records Report
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Detailed Records Pagination ---');
    const bookingsDetail = await ReportsService.getDetailedRecordsReport('ADMIN', admin!.id, {
      type: 'bookings',
      exhibitionId: testExhibition.id,
      page: 1,
      limit: 10,
    });
    assert(bookingsDetail.items.length >= 1, 'Detailed bookings returned records');
    assert(!!bookingsDetail.summary, 'Pagination-independent summary exists');
    assert(Number(bookingsDetail.summary.totalValue) >= 47200, 'Global summary matches filtered dataset');

    // -------------------------------------------------------------
    // TEST 6: CSV Export Generation
    // -------------------------------------------------------------
    console.log('\n--- Test 6: CSV Export Generation ---');
    const csvContent = await ReportsService.exportReportCsv('ADMIN', admin!.id, {
      type: 'bookings',
      exhibitionId: testExhibition.id,
    });
    assert(typeof csvContent === 'string' && csvContent.length > 50, 'CSV export string generated');
    assert(csvContent.includes(bookingA.bookingReference), 'CSV export includes Booking A reference');
    assert(csvContent.includes('Booking Reference'), 'CSV header present');

    // -------------------------------------------------------------
    // TEST 7: Staff Role Scoping
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Staff Operational Data Isolation ---');
    const staffOverview = await ReportsService.getOverview('STAFF', staff!.id);
    assert(staffOverview.roleScope === 'STAFF', 'Role scope is STAFF');
    assert(staffOverview.totalRevenue === undefined || staffOverview.totalRevenue === 0, 'Platform financial revenue is excluded for staff');

    console.log(`\n🎉 All ${testsPassed} Platform Reports tests passed! (${testsFailed} failed)`);
  } finally {
    console.log('\n--- Cleaning up test records ---');
    await prisma.invoice.deleteMany({ where: { id: invoiceA.id } });
    await prisma.payment.deleteMany({ where: { id: paymentA.id } });
    await prisma.bookingStall.deleteMany({ where: { bookingId: { in: [bookingA.id, bookingB.id] } } });
    await prisma.booking.deleteMany({ where: { id: { in: [bookingA.id, bookingB.id] } } });
    await prisma.stall.deleteMany({ where: { id: { in: [stall1.id, stall2.id] } } });
    await prisma.$disconnect();
  }
}

runComprehensiveReportsTests().catch(async (err) => {
  console.error('Fatal test error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
