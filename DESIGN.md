# DESIGN.md - Buoyant Stall Booking System Design Language

## Design Philosophy & Anti-Slop Principles
This repository strictly enforces high visual taste, rich contrast, modern typography, and refined micro-interactions.

### 1. Color Palette & Dark Mode Strategy
- **Backgrounds**: Light (`#F8FAFC`, `bg-slate-50`), Dark (`#0F172A`, `bg-slate-900`), Rich Hero (`from-slate-900 via-purple-950 to-slate-950`).
- **Accent Hierarchy**:
  - Primary Action / Brand: Deep Purple (`bg-purple-600 hover:bg-purple-700`).
  - Operational Success / Confirmed: Emerald (`text-emerald-600`, `bg-emerald-500/10`).
  - Pending / Warning: Warm Amber / Orange (`text-amber-600`, `bg-amber-500/10`).
  - Information / Exhibitor: Slate / Indigo (`text-indigo-600`, `bg-indigo-500/10`).

### 2. Typography & Numbers
- **Font Stack**: Inter / System Sans for body UI, Monospace (`font-mono`) for monetary amounts, event codes, timestamps, and stall numbers.
- **Hierarchy**: Bold Tracking (`tracking-tight`), `font-black` (900 weight) for primary numerical callouts.

### 3. Surface & Depth Rules
- **Borders**: Thin, semi-transparent borders (`border-slate-200/80 dark:border-slate-800`).
- **Elevation**: Hover elevation transform (`hover:-translate-y-1 transition-all duration-300`), soft drop shadows (`shadow-xs` to `shadow-2xl`).
- **Glow & Glassmorphism**: Backdrop blurs (`backdrop-blur-md`) and ambient glow circles behind hero cards.

### 4. Component Patterns
- **Status Indicators**: Pulsing live dots (`animate-ping`) for active status pills.
- **Tables**: Zebra hover states (`hover:bg-purple-50/40`), pill badges for status tags, monospaced tabular numbers.
