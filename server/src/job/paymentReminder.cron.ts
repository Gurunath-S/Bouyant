
import cron from "node-cron";
import { prisma } from "../config/db.js";
import { Prisma } from "@prisma/client";
import { EmailService } from "../services/email.service.js";
import {WhatsappService} from "../services/whatsapp.service.js";
export function startPaymentReminderCron() {
  cron.schedule(
    "* * * * *",  
    async () => {

      try {
        const reminders = await prisma.paymentReminder.findMany({
          where: {
            status: "PENDING",
            reminderDate: {
              lte: new Date(),
            },
          },
          orderBy: {
            reminderDate: "asc",
          },
          take: 100,
          include: {
            payment: {
              select: {
                nextPaymentDate: true,
              },
            },
          },
        });

        for (const reminder of reminders) {
          try {
            const nextPaymentDate = reminder.payment?.nextPaymentDate ?? reminder.reminderDate;

            // Atomically claim the reminder so another cron worker
            // cannot process the same PENDING record simultaneously.
            const claimed = await prisma.paymentReminder.updateMany({
              where: {
                id: reminder.id,
                status: "PENDING",  
              },
              data: {
                status: "SENDING",
              },
            });

            if (claimed.count === 0) {
              continue;
            }

            const booking = await prisma.booking.findUnique({
                where: { id: reminder.bookingId },
                select: {
                  id: true,
                  bookingReference: true,
                  balanceAmount: true,
                  status: true,

                  company: {
                    select: {
                      name: true,
                      email: true,
                      contactPerson: true,
                      mobile:true
                    },
                  },

                  exhibition: {
                    select: {
                      title: true,
                    },
                  },
                },
              });

            // Booking was deleted or is no longer awaiting payment.
            if (!booking) {
              await prisma.paymentReminder.update({
                where: { id: reminder.id },
                data: { status: "CANCELLED" },
              });
              continue;
            }

            // Never send a reminder for a fully paid booking.
            if (
              new Prisma.Decimal(booking.balanceAmount)
                .lessThanOrEqualTo(0) ||
              booking.status !== "PENDING_PAYMENT"
            ) {
              await prisma.paymentReminder.update({
                where: { id: reminder.id },
                data: { status: "CANCELLED" },
              });
              continue;
            }
              // Get the actual payment due date, not the reminder date.

            // Adapt the arguments to your existing email service.
            // It should load the recipient and booking details and
            // include the current outstanding balance in the email.
                await EmailService.sendPaymentReminderEmail({
                  toEmail: booking.company.email,
                  toName: booking.company.contactPerson || booking.company.name,
                  bookingReference: booking.bookingReference,
                  exhibitionTitle: booking.exhibition.title,
                  remainingBalance: Number(booking.balanceAmount),
                  nextPaymentDate,
                });

                await prisma.paymentReminder.update({
                  where: { id: reminder.id },
                  data: {
                    status: "SENT",
                    sentAt: new Date(),
                    failureReason: null,
                  },
                });

          // whatsapp service for send remainder message
             try {
             const mobile = booking?.company?.mobile || "";
                if (!mobile) {
                console.log(
                    `[Payment Reminder] Missing mobile for ${booking.bookingReference}, skipping WhatsApp.`
                );
                return;
              }


             await WhatsappService.sendWhatsappRemainder({
                contactPerson:booking.company.contactPerson || booking.company.name,
                mobile,
                exhibitionName: booking.exhibition.title,
                bookingReference: booking.bookingReference,
                paymentAmount: Number(booking.balanceAmount),
                nextPaymentDate
              });
            } catch (whatsappError) {
              console.error(
                `[Payment Reminder] WhatsApp failed for ${booking.bookingReference}:`,
                whatsappError
              );
            }


          } catch (error) {

            // Retry during a later cron run.
            await prisma.paymentReminder.update({
              where: { id: reminder.id },
              data: {
                status: "CANCELLED",
                failureReason:
                  error instanceof Error
                    ? error.message
                    : "Unknown email error",
              },
            }).catch((updateError) => {
              console.error(
                "[Payment Reminder] Failed to reset status:",
                updateError
              );
            });
          }
        }
      } catch (error) {
        console.error("[Payment Reminder] Cron failed:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );
}
 