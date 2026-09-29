// server/src/config/razorpay.ts
import Razorpay from 'razorpay';
import { env } from './env.js';

export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_API_KEY,
  key_secret: env.RAZORPAY_API_SECRET,
});

