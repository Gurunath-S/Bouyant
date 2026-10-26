
import { DateTime } from "luxon";
import { Prisma } from "@prisma/client";

const TIME_ZONE = "Asia/Kolkata";

type TransactionClient = Prisma.TransactionClient;

export async function updateBookingPaymentReminder(
  tx: TransactionClient,
  bookingId: string,
  paymentId:string,
  nextPaymentDate: Date | null,
  balanceAmount: Prisma.Decimal
) {
  // 1. Cancel previous pending reminders.
  // This also prevents outdated reminders from being scheduled again.
  await tx.paymentReminder.updateMany({
    where: {
      bookingId,
      status: "PENDING",
    },
    data: {
      status: "CANCELLED",
    },
  });

  // 2. If the booking is fully paid, no reminder is needed.
  if (balanceAmount.lessThanOrEqualTo(0)) {
    return null;
  }

  // 3. Convert or fallback next payment date to India Standard Time.
  const todayIST = DateTime.now()
    .setZone(TIME_ZONE)
    .startOf("day");

  let dueDateIST: DateTime;

  if (nextPaymentDate) {
    dueDateIST = DateTime.fromJSDate(nextPaymentDate, {
      zone: "utc",
    })
      .setZone(TIME_ZONE)
      .startOf("day");
  } else {
    // Default to 15 days from today if no explicit date was provided
    dueDateIST = todayIST.plus({ days: 15 });
  }

  // If date was invalid or in the past, gracefully clamp to 15 days ahead instead of throwing
  if (!dueDateIST.isValid || dueDateIST.toMillis() < todayIST.toMillis()) {
    dueDateIST = todayIST.plus({ days: 15 });
  }

  let reminderTimeIST: DateTime;

  // 7. If payment is due today, send an overdue reminder tomorrow.
  if (dueDateIST.hasSame(todayIST, "day")) {
    reminderTimeIST = todayIST
      .plus({ days: 1 })
      .set({
        hour: 10,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
  } else {
    // 8. Otherwise, remind one day before the due date.
    reminderTimeIST = dueDateIST
      .minus({ days: 1 })
      .set({
        hour: 10,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
  }

  if (!reminderTimeIST.isValid) {
    throw new Error("Invalid reminder date.");
  }

  // 9. Store the reminder timestamp in UTC.
  // The cron job will compare this timestamp with the current time.
  const reminder = await tx.paymentReminder.create({
    data: {
      bookingId,
      paymentId,
      reminderDate: reminderTimeIST.toUTC().toJSDate(),
      status: "PENDING",
    },
  });

  return reminder;
}
 