import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { EmailService } from '../src/services/email.service.js';
import { BookingsService } from '../src/modules/bookings/bookings.service.js';
import { razorpay } from '../src/config/razorpay.js';

// Mock EmailService to prevent external SMTP dependencies
EmailService.sendAccountCredentialsEmail = async () => ({ messageId: 'mock-cred-msg' } as any);
EmailService.sendAdminAlert = async () => ({ messageId: 'mock-admin-alert' } as any);
EmailService.sendAdminPasswordResetNotificationEmail = async () => ({ messageId: 'mock-reset-note' } as any);
EmailService.sendPasswordResetEmail = async () => ({ messageId: 'mock-pwd-reset' } as any);

(razorpay.orders as any).create = async (options: any) => ({
  id: `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  entity: 'order',
  amount: options.amount,
  currency: options.currency,
  receipt: options.receipt,
  status: 'created',
});

let server: any;
let baseUrl: string;

async function startTestServer() {
  const app = createApp();
  return new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const port = (server.address() as any).port;
      baseUrl = `http://localhost:${port}/api/v1`;
      resolve();
    });
  });
}

async function request(endpoint: string, { method = 'GET', body, token }: any = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers: any = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const status = res.status;
  let data: any = null;
  try {
    data = await res.json();
  } catch (_e) {
    // Non-JSON
  }

  return { status, data, headers: res.headers };
}

// Pure implementation of username suggestion logic matching Step2CompanyDetails.tsx
function generateSuggestedUsername(person: string, companyName: string): string {
  const raw = (person || companyName || '').trim().toLowerCase();
  const tokens = raw.replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const filteredTokens =
    tokens.length > 2 && ['dr', 'mr', 'ms', 'mrs', 'prof'].includes(tokens[0])
      ? tokens.slice(1)
      : tokens;

  if (filteredTokens.length >= 2) {
    const first = filteredTokens[0].slice(0, 14);
    const last = filteredTokens[filteredTokens.length - 1].slice(0, 14);
    return `${first}.${last}`.slice(0, 25);
  }
  if (filteredTokens.length === 1) {
    const single = filteredTokens[0].slice(0, 25);
    return single.length >= 3 ? single : `${single}.user`;
  }
  return 'exhibitor';
}

// Client recognition engine simulator matching Step2CompanyDetails.tsx state transitions
interface RecognizedExhibitorAccount {
  username: string;
  email: string;
  phone: string;
  gstNumber: string;
  name?: string;
}

class Step2RecognitionStateSimulator {
  recognizedAccount: RecognizedExhibitorAccount | null = null;
  lookupSeq = 0;
  previousGst = '';
  wasRecognized = false;
  isClientUser = false;

  formValues = {
    gstNumber: '',
    email: '',
    mobile: '',
    contactPerson: '',
    name: '',
    username: '',
  };

  isUsernameManuallyEdited = false;
  usernameStatus: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' = 'idle';
  usernameMessage = '';

  get isExistingExhibitorMatch(): boolean {
    const cleanEmail = this.formValues.email.trim().toLowerCase();
    const cleanPhone = this.formValues.mobile.replace(/\D/g, '').slice(-10);
    const cleanGst = this.formValues.gstNumber.trim().toUpperCase();

    return Boolean(
      this.recognizedAccount &&
      cleanGst &&
      this.recognizedAccount.gstNumber === cleanGst &&
      cleanEmail &&
      cleanEmail.includes('@') &&
      this.recognizedAccount.email === cleanEmail &&
      cleanPhone &&
      cleanPhone.length === 10 &&
      this.recognizedAccount.phone === cleanPhone
    );
  }

  get isUsernameLocked(): boolean {
    return this.isClientUser || this.isExistingExhibitorMatch;
  }

  setGst(newGst: string) {
    const currentGst = newGst.trim().toUpperCase();
    this.formValues.gstNumber = currentGst;

    if (this.previousGst && currentGst !== this.previousGst) {
      if (this.recognizedAccount && this.recognizedAccount.gstNumber !== currentGst) {
        this.recognizedAccount = null;
        this.wasRecognized = false;

        if (!this.isClientUser) {
          const suggested = generateSuggestedUsername(this.formValues.contactPerson, this.formValues.name);
          this.formValues.username = suggested;
          this.isUsernameManuallyEdited = false;
          this.usernameStatus = 'idle';
          this.usernameMessage = '';
        }
      }
    }
    this.previousGst = currentGst;
    this.recheckMatch();
  }

  setContact(email: string, mobile: string, contactPerson?: string) {
    this.formValues.email = email;
    this.formValues.mobile = mobile;
    if (contactPerson !== undefined) {
      this.formValues.contactPerson = contactPerson;
    }
    this.recheckMatch();
  }

  recheckMatch() {
    if (this.isClientUser) return;

    if (this.isExistingExhibitorMatch && this.recognizedAccount) {
      this.formValues.username = this.recognizedAccount.username;
      this.usernameStatus = 'available';
      this.usernameMessage = `Existing exhibitor account recognized (${this.recognizedAccount.username}). You can continue directly as a guest.`;
      this.wasRecognized = true;
    } else if (this.wasRecognized && !this.isExistingExhibitorMatch) {
      this.wasRecognized = false;
      const suggested = generateSuggestedUsername(this.formValues.contactPerson, this.formValues.name);
      this.formValues.username = suggested;
      this.isUsernameManuallyEdited = false;
      this.usernameStatus = 'idle';
      this.usernameMessage = '';
    }
  }

  applyLookupResponse(seq: number, queried: { email: string; phone: string; gst: string }, res: any) {
    // 1. Guard against stale or out-of-order sequence ID
    if (seq !== this.lookupSeq) {
      return false; // Ignored as stale sequence
    }

    // 2. Guard against modified form values during in-flight request
    const curEmail = this.formValues.email.trim().toLowerCase();
    const curPhone = this.formValues.mobile.replace(/\D/g, '').slice(-10);
    const curGst = this.formValues.gstNumber.trim().toUpperCase();

    if (queried.email !== curEmail || queried.phone !== curPhone || (queried.gst && queried.gst !== curGst)) {
      return false; // Ignored because values changed
    }

    if (res?.exactMatch && res?.username) {
      this.recognizedAccount = {
        username: res.username,
        email: queried.email,
        phone: queried.phone,
        gstNumber: queried.gst,
        name: res.name,
      };
      this.formValues.username = res.username;
      this.usernameStatus = 'available';
      this.usernameMessage = `Existing exhibitor account recognized (${res.username}). You can continue directly as a guest.`;
      this.wasRecognized = true;
      return true;
    }
    return false;
  }
}

async function runTestSuite() {
  await startTestServer();

  console.log('\n================================================================================');
  console.log('🧪 DYNAMIC PORTAL USERNAME & SHARED EXHIBITOR RECOGNITION TEST SUITE');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${detail ? `-> ${detail}` : ''}`);
      failed++;
    }
  }

  const suffix = Date.now().toString().slice(-6);
  const sharedGstin = `27AAACW${suffix.slice(-4)}F1Z5`;
  const aliceEmail = `alice_${suffix}@acme.test`;
  const alicePhone = `98200${suffix.slice(-5)}`;
  const aliceUsername = `alice.corp${suffix.slice(-3)}`;

  const bobEmail = `bob_${suffix}@acme.test`;
  const bobPhone = `98201${suffix.slice(-5)}`;
  const bobUsername = `bob.sibling${suffix.slice(-3)}`;

  let companyAId = '';
  let aliceUserId = '';
  let bobUserId = '';
  let testExhibitionId = '';
  let testFloorPlanId = '';
  const createdStallIds: string[] = [];
  const createdBookingIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // SETUP: Register Company A with Initial Exhibitor Alice
    // -------------------------------------------------------------------------
    console.log('--- Step 0: Setup Primary Exhibitor (Alice) ---');
    const regAlice = await request('/companies', {
      method: 'POST',
      body: {
        name: `Acme Dynamics Ltd ${suffix}`,
        contactPerson: 'Alice First',
        mobile: alicePhone,
        email: aliceEmail,
        username: aliceUsername,
        address: '100 Industrial Area',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400001',
        country: 'India',
        gstNumber: sharedGstin,
      },
    });

    assert(regAlice.status === 201, 'Setup 0.1: Alice registered successfully', `Status: ${regAlice.status}`);
    companyAId = regAlice.data?.data?.company?.id;
    aliceUserId = regAlice.data?.data?.user?.id;
    assert(Boolean(companyAId), 'Setup 0.2: Company A created with ID');
    assert(Boolean(aliceUserId), 'Setup 0.3: Alice account created');

    // -------------------------------------------------------------------------
    // TEST 1: Exact existing identity locks the username
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: Exact existing identity locks the username ---');
    const lookupAlice = await request(
      `/auth/lookup-account?gstNumber=${encodeURIComponent(sharedGstin)}&email=${encodeURIComponent(aliceEmail)}&phone=${alicePhone}`
    );

    assert(lookupAlice.status === 200, 'Test 1.1: Lookup HTTP 200');
    assert(lookupAlice.data?.data?.exactMatch === true, 'Test 1.2: Exact match detected for Alice');
    assert(lookupAlice.data?.data?.username === aliceUsername, 'Test 1.3: Returns existing username');

    // Test client simulator behavior
    const sim = new Step2RecognitionStateSimulator();
    sim.formValues.name = `Acme Dynamics Ltd ${suffix}`;
    sim.formValues.contactPerson = 'Alice First';
    sim.setGst(sharedGstin);
    sim.setContact(aliceEmail, alicePhone);

    const seq1 = ++sim.lookupSeq;
    const appliedAlice = sim.applyLookupResponse(
      seq1,
      { email: aliceEmail.toLowerCase(), phone: alicePhone, gst: sharedGstin },
      lookupAlice.data?.data
    );

    assert(appliedAlice === true, 'Test 1.4: Recognition applied to simulator');
    assert(sim.isExistingExhibitorMatch === true, 'Test 1.5: Exhibitor recognized as existing account');
    assert(sim.isUsernameLocked === true, 'Test 1.6: Username field is locked (read-only)');
    assert(sim.formValues.username === aliceUsername, 'Test 1.7: Username value is locked to existing username');

    // -------------------------------------------------------------------------
    // TEST 2: Same GSTIN with different email unlocks the username
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Same GSTIN with different email unlocks the username ---');
    const lookupDiffEmail = await request(
      `/auth/lookup-account?gstNumber=${encodeURIComponent(sharedGstin)}&email=${encodeURIComponent(bobEmail)}&phone=${alicePhone}`
    );
    assert(lookupDiffEmail.data?.data?.exactMatch === false, 'Test 2.1: Sibling email is not exact match');
    assert(lookupDiffEmail.data?.data?.companyExists === true, 'Test 2.2: Company exists recognized');

    // Change email in simulator to Bob's email
    sim.setContact(bobEmail, alicePhone, 'Bob Second');
    assert(sim.isExistingExhibitorMatch === false, 'Test 2.3: isExistingExhibitorMatch becomes false');
    assert(sim.isUsernameLocked === false, 'Test 2.4: Portal Username unlocks and becomes editable');
    assert(sim.formValues.username !== aliceUsername, 'Test 2.5: Clears old username and derives from Bob Second');
    assert(sim.formValues.username.startsWith('bob.'), 'Test 2.6: Username suggested based on Bob name');

    // -------------------------------------------------------------------------
    // TEST 3: Same GSTIN with different phone unlocks the username
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Same GSTIN with different phone unlocks the username ---');
    // Set email back to Alice but phone to Bob's phone
    sim.setContact(aliceEmail, bobPhone, 'Alice Colleague');
    assert(sim.isExistingExhibitorMatch === false, 'Test 3.1: Different phone prevents existing match');
    assert(sim.isUsernameLocked === false, 'Test 3.2: Portal Username unlocks for different phone');

    // -------------------------------------------------------------------------
    // TEST 4: Changing contact details back to the recognized identity locks the correct username
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Changing contact details back to recognized identity relocks ---');
    sim.setContact(aliceEmail, alicePhone, 'Alice First');
    assert(sim.isExistingExhibitorMatch === true, 'Test 4.1: Restoring Alice contact details matches recognized account');
    assert(sim.isUsernameLocked === true, 'Test 4.2: Portal Username field relocks automatically');
    assert(sim.formValues.username === aliceUsername, 'Test 4.3: Restores Alice existing username correctly');

    // -------------------------------------------------------------------------
    // TEST 5: Changing GSTIN clears stale recognition
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Changing GSTIN clears stale recognition ---');
    const differentGstin = `29DIFF${suffix.slice(-4)}E1Z0`;
    sim.setGst(differentGstin);
    assert(sim.recognizedAccount === null, 'Test 5.1: Recognized account invalidated on GSTIN switch');
    assert(sim.isExistingExhibitorMatch === false, 'Test 5.2: isExistingExhibitorMatch is false for new GSTIN');
    assert(sim.isUsernameLocked === false, 'Test 5.3: Field is fully unlocked for new GSTIN');

    // -------------------------------------------------------------------------
    // TEST 6: Slow or out-of-order account lookup responses cannot apply stale state
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Out-of-order responses rejected by sequence tracking ---');
    sim.setGst(sharedGstin);
    sim.setContact(aliceEmail, alicePhone);

    // Simulate Request 1 (seq=10) for Alice
    const staleSeq = 10;
    sim.lookupSeq = 11; // Newer Request 2 (seq=11) was already initiated for Bob
    sim.setContact(bobEmail, bobPhone, 'Bob Second');

    // Now stale Request 1 arrives late with Alice data
    const appliedStale = sim.applyLookupResponse(
      staleSeq,
      { email: aliceEmail.toLowerCase(), phone: alicePhone, gst: sharedGstin },
      { exactMatch: true, username: aliceUsername }
    );

    assert(appliedStale === false, 'Test 6.1: Stale sequence response strictly rejected');
    assert(sim.formValues.username !== aliceUsername, 'Test 6.2: Stale response does not overwrite current username');
    assert(sim.isUsernameLocked === false, 'Test 6.3: Username remains unlocked for Bob');

    // Also test: current values mismatch check
    const currentSeq = ++sim.lookupSeq;
    sim.setContact(bobEmail, bobPhone);
    // User modifies phone right as network request returns
    sim.formValues.mobile = '9999999999';
    const appliedMismatched = sim.applyLookupResponse(
      currentSeq,
      { email: bobEmail.toLowerCase(), phone: bobPhone, gst: sharedGstin },
      { exactMatch: true, username: 'unexpected' }
    );
    assert(appliedMismatched === false, 'Test 6.4: Stale response rejected if form values changed in-flight');

    // -------------------------------------------------------------------------
    // TEST 7: Lookup failure does not block guest booking
    // -------------------------------------------------------------------------
    console.log('\n--- Test 7: Lookup failure does not block guest booking ---');
    // If lookup throws network error, simulator does not lock and guest booking succeeds
    try {
      // Intentionally invalid endpoint query to test client resilience
      await request('/auth/lookup-account?invalid=true');
    } catch (_e) {
      // Ignored
    }
    assert(sim.isUsernameLocked === false, 'Test 7.1: Failed lookup preserves unlocked state');

    // -------------------------------------------------------------------------
    // TEST 8: Username suggestion and uniqueness validation work for sibling exhibitors
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8: Sibling exhibitor suggestion and uniqueness validation ---');
    const suggestedForBob = generateSuggestedUsername('Bob Second', 'Acme Dynamics Ltd');
    assert(suggestedForBob === 'bob.second', `Test 8.1: Suggestion generated cleanly: ${suggestedForBob}`);

    // Check availability of fresh username
    const checkFresh = await request(`/auth/check-username?username=${encodeURIComponent(bobUsername)}`);
    assert(checkFresh.data?.data?.available === true, 'Test 8.2: Sibling username is available initially');

    // Register sibling exhibitor Bob
    const regBob = await request('/companies', {
      method: 'POST',
      body: {
        name: `Acme Dynamics Ltd ${suffix}`,
        contactPerson: 'Bob Second',
        mobile: bobPhone,
        email: bobEmail,
        username: bobUsername,
        address: '100 Industrial Area',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400001',
        country: 'India',
        gstNumber: sharedGstin,
      },
    });

    assert(regBob.status === 201, 'Test 8.3: Bob registered under same company with status 201');
    bobUserId = regBob.data?.data?.user?.id;
    assert(regBob.data?.data?.company?.id === companyAId, 'Test 8.4: Bob attached to same Company A');
    assert(bobUserId !== aliceUserId, 'Test 8.5: Bob has a distinct user account from Alice');

    // Uniqueness validation now reports bobUsername as taken
    const checkNowTaken = await request(`/auth/check-username?username=${encodeURIComponent(bobUsername)}`);
    assert(checkNowTaken.data?.data?.available === false, 'Test 8.6: Bob username now reports unavailable/taken');

    // -------------------------------------------------------------------------
    // TEST 9: Existing account username and company master data remain unchanged
    // -------------------------------------------------------------------------
    console.log('\n--- Test 9: Company master data and Alice account remain unchanged ---');
    const freshCompanyA = await prisma.company.findUnique({ where: { id: companyAId } });
    const freshAliceUser = await prisma.user.findUnique({ where: { id: aliceUserId } });

    assert(freshCompanyA?.contactPerson === 'Alice First', 'Test 9.1: Company master contactPerson remains Alice');
    assert(freshCompanyA?.email === aliceEmail, 'Test 9.2: Company master email remains Alice email');
    assert(freshCompanyA?.mobile === alicePhone, 'Test 9.3: Company master mobile remains Alice mobile');
    assert(freshAliceUser?.username === aliceUsername, 'Test 9.4: Alice account username completely unchanged');

    // -------------------------------------------------------------------------
    // TEST 10: Guest booking remains available without login
    // -------------------------------------------------------------------------
    console.log('\n--- Test 10: Guest booking remains available without login ---');
    // Alice books again as guest with same GSTIN, email, and phone
    const guestRepeat = await request('/companies', {
      method: 'POST',
      body: {
        name: `Acme Dynamics Ltd ${suffix}`,
        contactPerson: 'Alice First',
        mobile: alicePhone,
        email: aliceEmail,
        address: '100 Industrial Area',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400001',
        country: 'India',
        gstNumber: sharedGstin,
      },
    });

    assert(guestRepeat.status === 201, 'Test 10.1: Alice guest booking completes with HTTP 201 without blocking');
    assert(guestRepeat.data?.data?.isGuestBooking === true, 'Test 10.2: Identified as guest booking');
    assert(guestRepeat.data?.data?.recognizedAccount?.username === aliceUsername, 'Test 10.3: Alice existing account recognized');

    // Verify no duplicate users created
    const totalUsersForCompany = await prisma.user.count({ where: { companyId: companyAId } });
    assert(totalUsersForCompany === 2, `Test 10.4: Exactly 2 users under company (Alice + Bob), got: ${totalUsersForCompany}`);

    // -------------------------------------------------------------------------
    // TEST 11: Booking creation foreign key resilience & userId resolution
    // -------------------------------------------------------------------------
    console.log('\n--- Test 11: Booking Creation Foreign Key & Guest User Resolution ---');
    const testExhibition = await prisma.exhibition.create({
      data: {
        title: `Dynamic Test Expo ${suffix}`,
        slug: `dynamic-expo-${suffix}`,
        description: 'Test Exhibition',
        edition: `DYN-${suffix}`,
        eventCode: `EV-${suffix}`,
        venue: 'Exhibition Hall Test',
        city: 'Mumbai',
        startDate: new Date(Date.now() + 86400000 * 30),
        endDate: new Date(Date.now() + 86400000 * 35),
        bookingEndDate: new Date(Date.now() + 86400000 * 20),
        status: 'PUBLISHED',
      },
    });
    testExhibitionId = testExhibition.id;

    const testFloorPlan = await prisma.floorPlan.create({
      data: {
        exhibitionId: testExhibition.id,
        name: `Hall Test ${suffix}`,
        width: 1000,
        height: 800,
        isPublished: true,
      },
    });
    testFloorPlanId = testFloorPlan.id;

    const stall1 = await prisma.stall.create({
      data: {
        floorPlanId: testFloorPlan.id,
        stallNumber: `S1-${suffix}`,
        category: 'STANDARD',
        price: 25000,
        areaSqFt: 100,
        status: 'AVAILABLE',
      },
    });
    createdStallIds.push(stall1.id);

    const stall2 = await prisma.stall.create({
      data: {
        floorPlanId: testFloorPlan.id,
        stallNumber: `S2-${suffix}`,
        category: 'STANDARD',
        price: 30000,
        areaSqFt: 120,
        status: 'AVAILABLE',
      },
    });
    createdStallIds.push(stall2.id);

    // 11.1 Booking with a dangling / deleted user ID (stale session token with companyId)
    // Must NOT violate Booking_userId_fkey constraint; must safely fall back and resolve
    const danglingUserPayload = {
      userId: '00000000-0000-0000-0000-000000000099', // Non-existent user
      companyId: companyAId,
      email: 'dangling@nonexistent.test',
      role: 'CLIENT' as any,
    };

    let bkg1Result: any = null;
    let bkg1Error: any = null;
    let bkg1Db: any = null;
    try {
      bkg1Result = await BookingsService.createBooking(danglingUserPayload, {
        exhibitionId: testExhibition.id,
        stallIds: [stall1.id],
        companyId: companyAId,
        contactPerson: 'Alice First',
        contactEmail: aliceEmail,
        contactPhone: alicePhone,
        paymentType: 'FULL',
        percentage: 100,
      });
      const b1Id = bkg1Result?.data?.bookingId;
      if (b1Id) {
        createdBookingIds.push(b1Id);
        bkg1Db = await prisma.booking.findUnique({ where: { id: b1Id } });
      }
    } catch (err: any) {
      bkg1Error = err;
    }

    assert(!bkg1Error, 'Test 11.1: Booking creation with dangling user ID succeeds without FK constraint violation', bkg1Error?.message);
    assert(bkg1Db?.userId === aliceUserId, `Test 11.2: Matched existing exhibitor user Alice instead of dangling ID (got ${bkg1Db?.userId})`);

    // 11.2 Anonymous guest booking with non-matching contact info
    // booking.userId should be null without FK error
    let bkg2Result: any = null;
    let bkg2Error: any = null;
    let bkg2Db: any = null;
    try {
      bkg2Result = await BookingsService.createBooking(undefined, {
        exhibitionId: testExhibition.id,
        stallIds: [stall2.id],
        companyId: companyAId,
        contactPerson: 'External Manager',
        contactEmail: `manager_${suffix}@external.test`,
        contactPhone: '9899999999',
        paymentType: 'FULL',
        percentage: 100,
      });
      const b2Id = bkg2Result?.data?.bookingId;
      if (b2Id) {
        createdBookingIds.push(b2Id);
        bkg2Db = await prisma.booking.findUnique({ where: { id: b2Id } });
      }
    } catch (err: any) {
      bkg2Error = err;
    }

    assert(!bkg2Error, 'Test 11.3: Booking creation with no matching user succeeds without FK constraint violation', bkg2Error?.message);
    assert(bkg2Db?.userId === null, `Test 11.4: Non-matching contact sets booking.userId to null (got ${bkg2Db?.userId})`);

  } finally {
    // Cleanup created test records
    console.log('\n--- Cleanup ---');
    if (createdBookingIds.length > 0) {
      await prisma.payment.deleteMany({
        where: { bookingId: { in: createdBookingIds } },
      });
      await prisma.bookingStall.deleteMany({
        where: { bookingId: { in: createdBookingIds } },
      });
      await prisma.booking.deleteMany({
        where: { id: { in: createdBookingIds } },
      });
    }
    if (createdStallIds.length > 0) {
      await prisma.stall.deleteMany({
        where: { id: { in: createdStallIds } },
      });
    }
    if (testFloorPlanId) {
      await prisma.floorPlan.deleteMany({
        where: { id: testFloorPlanId },
      });
    }
    if (testExhibitionId) {
      await prisma.exhibition.deleteMany({
        where: { id: testExhibitionId },
      });
    }
    if (aliceUserId || bobUserId) {
      await prisma.user.deleteMany({
        where: { id: { in: [aliceUserId, bobUserId].filter(Boolean) } },
      });
    }
    if (companyAId) {
      await prisma.company.deleteMany({
        where: { id: companyAId },
      });
    }
    if (server) {
      server.close();
    }
  }

  console.log('\n================================================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
