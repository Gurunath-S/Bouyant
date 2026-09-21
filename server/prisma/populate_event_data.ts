import { PrismaClient, UserRole, BookingStatus, PaymentStatus, BookingPaymentStatus, StallStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Populating database with sample exhibitors, bookings, and payments for Global Tech Expo 2026...');

  // 1. Find Global Tech Expo 2026
  const exhibition = await prisma.exhibition.findFirst({
    where: {
      title: { contains: 'Global Tech Expo', mode: 'insensitive' }
    },
    include: {
      floorPlans: {
        include: {
          stalls: true
        }
      }
    }
  });

  if (!exhibition) {
    console.error('❌ Exhibition "Global Tech Expo 2026" not found in DB.');
    return;
  }

  const allStalls = exhibition.floorPlans.flatMap(fp => fp.stalls);
  console.log(`📌 Found Exhibition: ${exhibition.title} (${exhibition.id}), total stalls across floor plans: ${allStalls.length}`);

  // Get Admin user
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser) {
    console.error('❌ Admin user not found.');
    return;
  }

  // 2. Create sample exhibitor users and companies
  const sampleExhibitors = [
    {
      user: { name: 'Aarav Sharma', email: 'aarav.sharma@nexus-tech.io', phone: '+91 98765 43210' },
      company: { name: 'Nexus AI Solutions Pvt Ltd', companyCode: 'NEXUS01', gstNumber: '27AAAAA0000A1Z5', industry: 'Artificial Intelligence', contactPerson: 'Aarav Sharma', designation: 'Managing Director', city: 'Mumbai', state: 'Maharashtra' }
    },
    {
      user: { name: 'Priya Patel', email: 'priya@quantum-robotics.com', phone: '+91 98123 45678' },
      company: { name: 'Quantum Robotics & Cybernetics', companyCode: 'QUANTUM02', gstNumber: '29BBBBB1111B2Z6', industry: 'Robotics', contactPerson: 'Priya Patel', designation: 'VP Business Development', city: 'Bengaluru', state: 'Karnataka' }
    },
    {
      user: { name: 'Rohan Verma', email: 'r.verma@cloudscale.in', phone: '+91 97654 32109' },
      company: { name: 'CloudScale Infrastructure Labs', companyCode: 'CLOUD03', gstNumber: '07CCCCC2222C3Z7', industry: 'Cloud & DevOps', contactPerson: 'Rohan Verma', designation: 'Head of Growth', city: 'New Delhi', state: 'Delhi' }
    },
    {
      user: { name: 'Ananya Rao', email: 'ananya@cyberfort-sec.com', phone: '+91 99887 76655' },
      company: { name: 'CyberFort Defense Systems', companyCode: 'CYBER04', gstNumber: '36DDDDD3333D4Z8', industry: 'Cybersecurity', contactPerson: 'Ananya Rao', designation: 'Chief Information Security Officer', city: 'Hyderabad', state: 'Telangana' }
    },
    {
      user: { name: 'Vikram Mehta', email: 'v.mehta@iot-connect.co', phone: '+91 91234 56789' },
      company: { name: 'IoT Connect Technologies', companyCode: 'IOTCON05', gstNumber: '24EEEEE4444E5Z9', industry: 'Internet of Things', contactPerson: 'Vikram Mehta', designation: 'Chief Technology Officer', city: 'Ahmedabad', state: 'Gujarat' }
    }
  ];

  const defaultPasswordHash = await bcrypt.hash('ExhibitorPass123!', 10);

  // Available stalls for assignment
  const availableStalls = allStalls.filter(s => s.status === 'AVAILABLE' || s.status === 'HELD');

  if (availableStalls.length < 5) {
    console.log(`⚠️ Only ${availableStalls.length} stalls available. Will assign as many as possible.`);
  }

  for (let i = 0; i < sampleExhibitors.length; i++) {
    const data = sampleExhibitors[i];
    const targetStall = availableStalls[i];

    if (!targetStall) break;

    // Create / Upsert User
    const user = await prisma.user.upsert({
      where: { email: data.user.email },
      update: {},
      create: {
        email: data.user.email,
        passwordHash: defaultPasswordHash,
        name: data.user.name,
        phone: data.user.phone,
        role: UserRole.CLIENT,
        isActive: true,
      }
    });

    // Create / Upsert Company
    const company = await prisma.company.upsert({
      where: { companyCode: data.company.companyCode },
      update: {},
      create: {
        name: data.company.name,
        companyCode: data.company.companyCode,
        gstNumber: data.company.gstNumber,
        industry: data.company.industry,
        contactPerson: data.company.contactPerson,
        email: data.user.email,
        mobile: data.user.phone,
        address: '100 Tech Park Way, Innovation Hub',
        city: data.company.city,
        state: data.company.state,
        pinCode: '400001',
        country: 'India',
      }
    });

    // Calculate totals
    const stallPrice = Number(targetStall.price);
    const taxAmount = Math.round(stallPrice * 0.18);
    const grandTotal = stallPrice + taxAmount;
    const bookingRef = `BK-GT01-${1000 + i}`;
    const paymentRef = `PAY-GT01-${5000 + i}`;
    const invoiceNum = `INV-2026-${8000 + i}`;

    const isPartial = i % 2 === 1; // Alternate between full and partial payment
    const paymentStatus = i === 4 ? PaymentStatus.PENDING : PaymentStatus.SUCCESS;
    const bookingStatus = i === 4 ? BookingStatus.INITIATED : BookingStatus.CONFIRMED;

    // Check if booking reference exists
    const existingBooking = await prisma.booking.findUnique({ where: { bookingReference: bookingRef } });
    if (existingBooking) {
      console.log(`ℹ️ Booking ${bookingRef} already exists. Skipping...`);
      continue;
    }

    // Create Booking & Payment in Transaction
    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          bookingReference: bookingRef,
          exhibitionId: exhibition.id,
          companyId: company.id,
          userId: user.id,
          totalAmount: stallPrice,
          taxAmount: taxAmount,
          grandTotal: grandTotal,
          paidAmount: isPartial ? Math.round(grandTotal * 0.5) : (bookingStatus === BookingStatus.CONFIRMED ? grandTotal : 0),
          balanceAmount: isPartial ? Math.round(grandTotal * 0.5) : (bookingStatus === BookingStatus.CONFIRMED ? 0 : grandTotal),
          paymentStatus: bookingStatus === BookingStatus.CONFIRMED ? (isPartial ? BookingPaymentStatus.PARTIALLY_PAID : BookingPaymentStatus.PAID_FULL) : BookingPaymentStatus.UNPAID,
          status: bookingStatus,
          stalls: {
            create: [
              {
                stallId: targetStall.id,
                price: stallPrice,
              }
            ]
          }
        }
      });

      // Update Stall Status
      await tx.stall.update({
        where: { id: targetStall.id },
        data: {
          status: bookingStatus === BookingStatus.CONFIRMED ? StallStatus.BOOKED_CONFIRMED : StallStatus.TEMPORARILY_HELD,
          heldUntil: bookingStatus === BookingStatus.CONFIRMED ? null : new Date(Date.now() + 15 * 60 * 1000),
          heldByUserId: bookingStatus === BookingStatus.CONFIRMED ? null : user.id,
        }
      });

      // Create Payment
      const paidAmount = isPartial ? Math.round(grandTotal * 0.5) : grandTotal;
      const payment = await tx.payment.create({
        data: {
          paymentReference: paymentRef,
          bookingId: booking.id,
          userId: user.id,
          amount: paidAmount,
          currency: 'INR',
          status: paymentStatus,
          provider: 'RAZORPAY',
          paymentMethod: i % 2 === 0 ? 'RAZORPAY_UPI' : 'OFFLINE_BANK_NEFT',
          installmentType: isPartial ? 'PARTIAL_50' : 'FULL',
          paidAt: paymentStatus === PaymentStatus.SUCCESS ? new Date() : null,
        }
      });

      // Create Invoice if confirmed
      if (bookingStatus === BookingStatus.CONFIRMED) {
        await tx.invoice.create({
          data: {
            invoiceNumber: invoiceNum,
            bookingId: booking.id,
            paymentId: payment.id,
            companyId: company.id,
            totalAmount: stallPrice,
            taxAmount: taxAmount,
            grandTotal: grandTotal,
            status: 'PAID',
            issueDate: new Date(),
          }
        });
      }

      console.log(`✅ Provisioned booking ${bookingRef} for ${company.name} on Stall ${targetStall.stallNumber}`);
    });
  }

  console.log('🎉 Sample bookings and users population complete!');
}

main()
  .catch((e) => {
    console.error('❌ Population script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
