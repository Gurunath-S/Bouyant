# Buoyant Media — B2B SaaS Exhibition Booking Platform

Buoyant Media is a B2B SaaS platform for Exhibition Stall Booking and Event Management.

## Architecture

- **`client/`**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Zustand, TanStack Query, React Hook Form, Zod.
- **`server/`**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Redis, JWT Authentication, Zod validation.

## Key Features

1. **Atomic Stall Booking & Concurrency**: PostgreSQL row-level locks and conditional status transitions (`UPDATE stalls SET status = 'TEMPORARILY_HELD' WHERE id = ... AND status = 'AVAILABLE'`) ensuring 0 double bookings under high burst traffic (~8,000 requests / 2 mins).
2. **Interactive SVG Floor Plan Engine**: Real-time visual canvas displaying stall availability, live hold countdowns, dimensions, pricing categories, and stall hover cards.
3. **Company Profile & Registration**: Exclusively links booking transactions to valid corporate entities with verified tax credentials (GST/PAN).
4. **Authoritative Server Pricing & Verification**: Server-side amount computation and payment verification preventing client-side price tampering.
5. **Automated Invoicing & Notifications**: Professional PDF/HTML invoices, receipts, and user/admin notifications.
6. **Admin Event & Layout Portal**: Interactive drag-and-drop stall manager, floor plan publisher, stall block/unblock, and admin-assisted booking.

## Getting Started

### Backend Setup (`server/`)
```bash
cd server
npm install
cp .env.example .env
npx prisma migrate dev
npm run seed
npm run dev
```

### Frontend Setup (`client/`)
```bash
cd client
npm install
npm run dev
```
