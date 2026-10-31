import { z } from 'zod';

export const CashPaymentSchema = z.object({
  bookingId: z
    .string()
    .min(1, 'Booking ID is required.'),

  amount: z.coerce
    .number()
    .finite()
    .positive('Cash payment amount must be greater than zero.')
    .refine(
      (amount) => Number.isSafeInteger(amount * 100),
      'Cash amount must have at most two decimal places.'
    ),

  nextDueDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Next due date must be in YYYY-MM-DD format.'
    )
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);

      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    }, 'Invalid next payment due date')
    .optional(),
});