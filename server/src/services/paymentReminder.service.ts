
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

  // 3. An outstanding balance requires a next payment date.
  if (!nextPaymentDate) {
    throw new Error(
      "Next payment date is required for an outstanding balance."
    );
  }

  // 4. Convert the selected payment date to India Standard Time.
  const dueDateIST = DateTime.fromJSDate(nextPaymentDate, {
    zone: "utc",
  })
    .setZone(TIME_ZONE)
    .startOf("day");

  if (!dueDateIST.isValid) {
    throw new Error("Invalid next payment date.");
  }

  // 5. Get today's calendar date in IST.
  const todayIST = DateTime.now()
    .setZone(TIME_ZONE)
    .startOf("day");

  // 6. Do not allow a payment due date in the past.
  if (dueDateIST.toMillis() < todayIST.toMillis()) {
    throw new Error(
      "Next payment date cannot be in the past."
    );
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
 