---
name: taste-design
description: Anti-slop, high-taste frontend design framework. Use when building or redesigning UI to enforce modern aesthetics, clean typography, rich interactions, micro-animations, structured layouts, and premium visual hierarchy.
---

# Taste Design System (Anti-Slop UI Guidelines)

## Core Philosophy
1. **Never generate generic "slop" UI**: Avoid basic rounded rectangles with flat default shadows and standard blue/purple gradients on plain white boxes without contrast or depth.
2. **High Visual Taste & Rhythm**:
   - **Typography**: Paired fonts, sharp tracking, deliberate font weights (font-semibold, font-extrabold, font-mono for metrics).
   - **Color Harmony**: Deep slates, rich dark tones, subtle borders (`border-slate-200/80 dark:border-slate-800`), controlled glassmorphism backdrop blurs (`backdrop-blur-md`), and refined accent highlights.
   - **Depth & Layers**: Layered surfaces using subtle shadows (`shadow-sm`, `shadow-xs`, `shadow-[0_10px_30px_-15px_rgba(0,0,0,0.1)]`), inner subtle borders, crisp badges, and interactive hover states (`hover:-translate-y-0.5 transition-all`).

## Admin Dashboard Specific Design Rules:
1. **Hero Active Event Card**:
   - Compact, ultra-clean horizontal card layout with rich backdrop styling or glass contrast.
   - Event image preview with sleek aspect ratio, crisp border, hover scale zoom.
   - Distinct status pills with custom dot indicators (e.g., live green pulsing dot for "Bookings Open").
   - Clear typography breakdown (Edition/Code badge, Title, Venue, DateRange).

2. **Metrics & KPI Cards**:
   - Distinct color-coded subtle highlight borders on top or accent icons with soft background containers.
   - Monospaced numeric emphasis (`font-mono font-extrabold text-2xl` or `text-3xl`).
   - Clean micro progress indicators & contextual trend indicators.

3. **Data Tables & Lists**:
   - Subtle zebra hover state (`hover:bg-slate-50/80 dark:hover:bg-slate-800/50`).
   - Rounded table wrapper (`rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden`).
   - Status badges with border rings and soft backgrounds.

4. **Interactions**:
   - Smooth transition speed (`duration-200 ease-out`).
   - Micro-interactions on buttons, links, and actionable rows.
