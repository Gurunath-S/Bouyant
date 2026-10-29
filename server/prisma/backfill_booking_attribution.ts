import { PrismaClient, BookingSource } from '@prisma/client';

const prisma = new PrismaClient();

async function backfill() {
  console.log('--- Backfilling Booking Attribution & Source ---');
  const bookings = await prisma.booking.findMany({
    include: {
      user: true,
      company: {
        include: {
          users: true,
        },
      },
      payments: true,
      exhibition: true,
    },
  });

  console.log(`Found ${bookings.length} bookings to evaluate.`);

  const allUsers = await prisma.user.findMany();
  const staffUsers = allUsers.filter((u) => u.role === 'STAFF');
  const adminUsers = allUsers.filter((u) => u.role === 'ADMIN');
  const superAdminUsers = allUsers.filter((u) => u.role === 'SUPERADMIN');

  let updatedCount = 0;

  for (const b of bookings) {
    let source: BookingSource = BookingSource.CLIENT_DIRECT;
    let actorUserId: string | null = b.bookedByUserId;

    // Check payments or company spcode for staff
    const hasStaffPayment = b.payments.some(
      (p) => p.provider === 'OFFLINE_STAFF' || (p.paymentMethod && p.paymentMethod.toUpperCase().includes('STAFF'))
    );
    const hasAdminPayment = b.payments.some(
      (p) => p.provider === 'OFFLINE_ADMIN' || (p.paymentMethod && p.paymentMethod.toUpperCase().includes('ADMIN'))
    );
    const spcode = (b.company?.spcode || '').toUpperCase();

    if (hasStaffPayment || spcode.startsWith('ST') || spcode.startsWith('SP') || b.user?.role === 'STAFF') {
      source = BookingSource.STAFF_ASSISTED;
      // Match staff user by spcode if available
      const matchingStaff = staffUsers.find((s) => s.spcode && s.spcode.toUpperCase() === spcode) || staffUsers[0];
      actorUserId = b.user?.role === 'STAFF' ? b.user.id : (matchingStaff?.id || actorUserId || staffUsers[0]?.id || null);
    } else if (hasAdminPayment || spcode.startsWith('AD') || b.user?.role === 'ADMIN') {
      source = BookingSource.ADMIN_DIRECT;
      const matchingAdmin = adminUsers.find((a) => a.spcode && a.spcode.toUpperCase() === spcode) || adminUsers[0];
      actorUserId = b.user?.role === 'ADMIN' ? b.user.id : (matchingAdmin?.id || actorUserId || adminUsers[0]?.id || null);
    } else if (spcode.startsWith('SA') || b.user?.role === 'SUPERADMIN') {
      source = BookingSource.SUPERADMIN_MANUAL;
      actorUserId = b.user?.role === 'SUPERADMIN' ? b.user.id : (superAdminUsers[0]?.id || actorUserId || null);
    } else {
      source = BookingSource.CLIENT_DIRECT;
      actorUserId = b.userId || b.company?.users?.find((u) => u.role === 'CLIENT')?.id || null;
    }

    await prisma.booking.update({
      where: { id: b.id },
      data: {
        bookingSource: source,
        bookedByUserId: actorUserId,
      },
    });
    updatedCount++;
  }

  console.log(`✅ Backfilled ${updatedCount} bookings with attribution and bookingSource.`);
}

backfill()
  .catch((e) => {
    console.error('Error backfilling:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
