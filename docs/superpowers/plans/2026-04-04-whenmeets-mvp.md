<!-- /autoplan restore point: /c/Users/qzsec/.gstack/projects/BORB-CHOI-whenmeets/main-autoplan-restore-20260404-033229.md -->
# WhenMeets MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first group scheduling app that replaces when2meet with modern UI, touch-friendly drag grid, and 3-level availability (Available / If Needed / Unavailable).

**Architecture:** Next.js App Router with server-side API routes handling all Supabase operations via service role key. Anonymous participants identified by UUID tokens stored in localStorage. Realtime updates via Supabase subscriptions with polling fallback.

**Tech Stack:** Next.js 15 (App Router), TailwindCSS v4, Supabase (PostgreSQL + Realtime), nanoid, bcryptjs, Vercel

---

## File Structure

```
src/
  app/
    layout.tsx                          # Root layout with Inter font + metadata
    page.tsx                            # Landing page (hero + CTA)
    globals.css                         # Tailwind imports + CSS variables
    new/
      page.tsx                          # Event creation form
    e/
      [id]/
        page.tsx                        # Event participate page (name entry + grid)
        results/
          page.tsx                      # Results heatmap + filters
    api/
      events/
        route.ts                        # POST: create event
        [id]/
          route.ts                      # GET: event info + participants
          verify/
            route.ts                    # POST: password verification
          participants/
            route.ts                    # POST: create participant
            [pid]/
              route.ts                  # PATCH: update availability
          results/
            route.ts                    # GET: aggregated results
  components/
    drag-grid/
      DragGrid.tsx                      # Main grid: renders time slots x dates
      GridCell.tsx                       # Single cell with availability color
      ModeSwitch.tsx                    # Available / If Needed / Unavailable selector
      useGridDrag.ts                    # Touch + mouse drag hook
    event-form/
      EventForm.tsx                     # Title + dates + time range + optional password
      DatePicker.tsx                    # Calendar-style multi-date selector
      TimeRangePicker.tsx               # Start/end time dropdowns
    results/
      HeatmapGrid.tsx                   # Read-only grid with color intensity
      ParticipantFilter.tsx             # Checkbox list to filter by participant
  lib/
    supabase/
      client.ts                         # Browser Supabase client (anon key)
      server.ts                         # Server Supabase client (service role key)
    constants.ts                        # Availability values, slot helpers
    types.ts                            # Shared TypeScript types
```

---

## Task 1: Project Initialization

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.env.local.example`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd d:/Develop/GitHub/whenmeets
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --yes
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js nanoid bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 3: Create environment variable template**

Create `.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Add `.env.local` to `.gitignore` (create-next-app likely already does this).

- [ ] **Step 4: Create shared types**

Create `src/lib/types.ts`:
```typescript
export type AvailabilityLevel = 0 | 1 | 2; // 0=unavailable, 1=if_needed, 2=available

// Keys are date strings "YYYY-MM-DD", values are objects mapping slot index to availability
// Slot index: 0=00:00, 1=00:30, 2=01:00, ..., 18=09:00, ..., 42=21:00
export type Availability = Record<string, Record<string, AvailabilityLevel>>;

export interface Event {
  id: string;
  title: string;
  dates: string[];       // ISO date strings
  time_start: number;    // Slot index (e.g., 18 = 09:00)
  time_end: number;      // Slot index, exclusive (e.g., 42 = 21:00)
  has_password: boolean;
  created_at: string;
}

export interface Participant {
  id: string;
  event_id: string;
  name: string;
  token: string;
  availability: Availability;
  created_at: string;
}
```

- [ ] **Step 5: Create constants and helpers**

Create `src/lib/constants.ts`:
```typescript
export const AVAILABILITY = {
  UNAVAILABLE: 0,
  IF_NEEDED: 1,
  AVAILABLE: 2,
} as const;

export const AVAILABILITY_COLORS = {
  0: 'bg-gray-100',       // Unavailable / empty
  1: 'bg-amber-300',      // If needed
  2: 'bg-emerald-400',    // Available
} as const;

export const MODE_LABELS = {
  2: 'Available',
  1: 'If Needed',
  0: 'Unavailable',
} as const;

/** Convert slot index to "HH:MM" string */
export function slotToTime(slot: number): string {
  const hours = Math.floor(slot / 2);
  const minutes = slot % 2 === 0 ? '00' : '30';
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

/** Generate array of slot indices between start (inclusive) and end (exclusive) */
export function generateSlots(start: number, end: number): number[] {
  const slots: number[] = [];
  for (let i = start; i < end; i++) {
    slots.push(i);
  }
  return slots;
}

/** Format date string "YYYY-MM-DD" to compact display like "Mon 4/7" */
export function formatDateCompact(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`;
}
```

- [ ] **Step 6: Create Supabase client utilities**

Create `src/lib/supabase/client.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Create `src/lib/supabase/server.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

- [ ] **Step 7: Update root layout with Inter font and Korean metadata**

Replace `src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WhenMeets - Group Scheduling Made Easy',
  description: 'Free, modern alternative to when2meet. Mobile-friendly drag grid for group scheduling.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={`${inter.className} antialiased bg-white text-gray-900`}>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Create minimal landing page**

Replace `src/app/page.tsx`:
```tsx
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-4xl font-bold tracking-tight">WhenMeets</h1>
      <p className="mt-3 text-lg text-gray-500">
        Group scheduling, actually usable on mobile.
      </p>
      <Link
        href="/new"
        className="mt-8 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
      >
        Create Event
      </Link>
    </div>
  );
}
```

- [ ] **Step 9: Verify dev server runs**

```bash
npm run dev
```

Open `http://localhost:3000` — should see "WhenMeets" heading with "Create Event" button.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with Tailwind, Supabase client, shared types"
```

---

## Task 2: Drag Grid — Static Rendering

**Files:**
- Create: `src/components/drag-grid/GridCell.tsx`, `src/components/drag-grid/ModeSwitch.tsx`, `src/components/drag-grid/DragGrid.tsx`
- Create: `src/app/demo/page.tsx` (temporary demo page for grid development)

- [ ] **Step 1: Create GridCell component**

Create `src/components/drag-grid/GridCell.tsx`:
```tsx
'use client';

import { AvailabilityLevel } from '@/lib/types';

const CELL_COLORS: Record<AvailabilityLevel | -1, string> = {
  [-1]: 'bg-gray-50',         // No response yet
  0: 'bg-gray-50',            // Unavailable (same as empty — eraser resets)
  1: 'bg-amber-300',          // If needed
  2: 'bg-emerald-400',        // Available
};

interface GridCellProps {
  date: string;
  slot: number;
  value: AvailabilityLevel | -1;  // -1 = no response
}

export default function GridCell({ date, slot, value }: GridCellProps) {
  return (
    <div
      data-date={date}
      data-slot={slot}
      className={`w-[44px] h-[20px] border-r border-gray-200 ${CELL_COLORS[value]} transition-colors duration-75 select-none
        ${slot % 2 === 0 ? 'border-t border-gray-300' : 'border-t border-gray-100'}`}
    />
  );
}
```

- [ ] **Step 2: Create ModeSwitch component**

Create `src/components/drag-grid/ModeSwitch.tsx`:
```tsx
'use client';

import { AvailabilityLevel } from '@/lib/types';

const MODES: { value: AvailabilityLevel; label: string; color: string; activeColor: string }[] = [
  { value: 2, label: 'Available', color: 'bg-emerald-100 text-emerald-700', activeColor: 'bg-emerald-500 text-white' },
  { value: 1, label: 'If Needed', color: 'bg-amber-100 text-amber-700', activeColor: 'bg-amber-400 text-white' },
  { value: 0, label: 'Unavailable', color: 'bg-gray-100 text-gray-600', activeColor: 'bg-gray-500 text-white' },
];

interface ModeSwitchProps {
  activeMode: AvailabilityLevel;
  onModeChange: (mode: AvailabilityLevel) => void;
}

export default function ModeSwitch({ activeMode, onModeChange }: ModeSwitchProps) {
  return (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
      {MODES.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onModeChange(mode.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
            ${activeMode === mode.value ? mode.activeColor : mode.color}`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create DragGrid component (static rendering only)**

Create `src/components/drag-grid/DragGrid.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Availability, AvailabilityLevel } from '@/lib/types';
import { generateSlots, slotToTime, formatDateCompact } from '@/lib/constants';
import GridCell from './GridCell';
import ModeSwitch from './ModeSwitch';

interface DragGridProps {
  dates: string[];
  timeStart: number;
  timeEnd: number;
  availability: Availability;
  onAvailabilityChange: (availability: Availability) => void;
}

export default function DragGrid({
  dates,
  timeStart,
  timeEnd,
  availability,
  onAvailabilityChange,
}: DragGridProps) {
  const [activeMode, setActiveMode] = useState<AvailabilityLevel>(2);
  const slots = generateSlots(timeStart, timeEnd);

  function getCellValue(date: string, slot: number): AvailabilityLevel | -1 {
    const dateData = availability[date];
    if (!dateData) return -1;
    const val = dateData[String(slot)];
    return val !== undefined ? val : -1;
  }

  return (
    <div className="flex flex-col gap-3">
      <ModeSwitch activeMode={activeMode} onModeChange={setActiveMode} />

      <div className="overflow-x-auto">
        <div className="inline-flex">
          {/* Time labels column */}
          <div className="flex flex-col pt-[28px]">
            {slots.map((slot) => (
              <div
                key={slot}
                className="h-[20px] pr-2 text-[10px] text-gray-400 text-right leading-[20px]"
              >
                {slot % 2 === 0 ? slotToTime(slot) : ''}
              </div>
            ))}
          </div>

          {/* Date columns */}
          {dates.map((date) => (
            <div key={date} className="flex flex-col">
              <div className="h-[28px] text-xs font-medium text-gray-600 text-center leading-[28px]">
                {formatDateCompact(date)}
              </div>
              {slots.map((slot) => (
                <GridCell
                  key={`${date}-${slot}`}
                  date={date}
                  slot={slot}
                  value={getCellValue(date, slot)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create demo page to test the grid**

Create `src/app/demo/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Availability } from '@/lib/types';
import DragGrid from '@/components/drag-grid/DragGrid';

// 7 days starting from today
function getNext7Days(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export default function DemoPage() {
  const [availability, setAvailability] = useState<Availability>({});
  const dates = getNext7Days();

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">Grid Demo</h1>
      <DragGrid
        dates={dates}
        timeStart={18}  // 09:00
        timeEnd={42}    // 21:00
        availability={availability}
        onAvailabilityChange={setAvailability}
      />
      <pre className="mt-4 text-xs bg-gray-50 p-2 rounded overflow-auto">
        {JSON.stringify(availability, null, 2)}
      </pre>
    </div>
  );
}
```

- [ ] **Step 5: Verify grid renders at `/demo`**

```bash
npm run dev
```

Open `http://localhost:3000/demo` — should see 7-column grid with time labels, mode switch buttons. Cells are all gray (no responses). Grid should fit on mobile width without horizontal scroll for 7 days.

- [ ] **Step 6: Commit**

```bash
git add src/components/drag-grid/ src/app/demo/
git commit -m "feat: add static drag grid with mode switch and cell rendering"
```

---

## Task 3: Drag Grid — Touch + Mouse Interaction

**Files:**
- Create: `src/components/drag-grid/useGridDrag.ts`
- Modify: `src/components/drag-grid/DragGrid.tsx`

This is the core technical risk of the project. The drag hook must handle:
- Mouse: mousedown → mousemove → mouseup
- Touch: touchstart → touchmove → touchend
- iOS Safari: use `Touch.clientX/clientY` with `document.elementFromPoint`
- Paint current mode on cells as finger/cursor drags over them
- Prevent page scroll during grid drag

- [ ] **Step 1: Create useGridDrag hook**

Create `src/components/drag-grid/useGridDrag.ts`:
```typescript
'use client';

import { useCallback, useRef } from 'react';
import { Availability, AvailabilityLevel } from '@/lib/types';

interface UseGridDragOptions {
  activeMode: AvailabilityLevel;
  availability: Availability;
  onAvailabilityChange: (availability: Availability) => void;
}

function getCellFromPoint(x: number, y: number): { date: string; slot: number } | null {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const cell = el.closest('[data-date][data-slot]') as HTMLElement | null;
  if (!cell) return null;
  const date = cell.dataset.date!;
  const slot = parseInt(cell.dataset.slot!, 10);
  return { date, slot };
}

export default function useGridDrag({
  activeMode,
  availability,
  onAvailabilityChange,
}: UseGridDragOptions) {
  const isDragging = useRef(false);
  const lastCell = useRef<string | null>(null);
  const draftRef = useRef<Availability>({});

  function applyToCell(date: string, slot: number) {
    const cellKey = `${date}:${slot}`;
    if (cellKey === lastCell.current) return; // Already painted
    lastCell.current = cellKey;

    const draft = { ...draftRef.current };
    if (!draft[date]) draft[date] = {};

    if (activeMode === 0) {
      // Unavailable mode = eraser: delete the key
      const dateCopy = { ...draft[date] };
      delete dateCopy[String(slot)];
      if (Object.keys(dateCopy).length === 0) {
        delete draft[date];
      } else {
        draft[date] = dateCopy;
      }
    } else {
      draft[date] = { ...draft[date], [String(slot)]: activeMode };
    }

    draftRef.current = draft;
    onAvailabilityChange(draft);
  }

  const handlePointerStart = useCallback(
    (x: number, y: number) => {
      isDragging.current = true;
      draftRef.current = JSON.parse(JSON.stringify(availability));
      lastCell.current = null;
      const cell = getCellFromPoint(x, y);
      if (cell) applyToCell(cell.date, cell.slot);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeMode, availability]
  );

  const handlePointerMove = useCallback((x: number, y: number) => {
    if (!isDragging.current) return;
    const cell = getCellFromPoint(x, y);
    if (cell) applyToCell(cell.date, cell.slot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode]);

  const handlePointerEnd = useCallback(() => {
    isDragging.current = false;
    lastCell.current = null;
  }, []);

  const gridProps = {
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      handlePointerStart(e.clientX, e.clientY);
    },
    onMouseMove: (e: React.MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    },
    onMouseUp: () => handlePointerEnd(),
    onMouseLeave: () => handlePointerEnd(),
    onTouchStart: (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handlePointerStart(touch.clientX, touch.clientY);
    },
    onTouchMove: (e: React.TouchEvent) => {
      e.preventDefault(); // Prevent scroll during drag
      const touch = e.touches[0];
      handlePointerMove(touch.clientX, touch.clientY);
    },
    onTouchEnd: () => handlePointerEnd(),
    onTouchCancel: () => handlePointerEnd(),
  };

  return { gridProps };
}
```

- [ ] **Step 2: Integrate useGridDrag into DragGrid**

Modify `src/components/drag-grid/DragGrid.tsx` — wrap the date columns in a container that receives `gridProps`:

Replace the `{/* Date columns */}` section and surrounding div:

```tsx
// Add import at top:
import useGridDrag from './useGridDrag';

// Inside component, after slots declaration:
const { gridProps } = useGridDrag({
  activeMode,
  availability,
  onAvailabilityChange,
});

// Replace the <div className="overflow-x-auto"> block:
<div className="overflow-x-auto">
  <div className="inline-flex">
    {/* Time labels column */}
    <div className="flex flex-col pt-[28px]">
      {slots.map((slot) => (
        <div
          key={slot}
          className="h-[20px] pr-2 text-[10px] text-gray-400 text-right leading-[20px]"
        >
          {slot % 2 === 0 ? slotToTime(slot) : ''}
        </div>
      ))}
    </div>

    {/* Date columns — drag-enabled area */}
    <div className="inline-flex touch-none" {...gridProps}>
      {dates.map((date) => (
        <div key={date} className="flex flex-col">
          <div className="h-[28px] text-xs font-medium text-gray-600 text-center leading-[28px]">
            {formatDateCompact(date)}
          </div>
          {slots.map((slot) => (
            <GridCell
              key={`${date}-${slot}`}
              date={date}
              slot={slot}
              value={getCellValue(date, slot)}
            />
          ))}
        </div>
      ))}
    </div>
  </div>
</div>
```

Note: `touch-none` CSS class prevents browser default touch behaviors (scroll, zoom) on the grid area.

- [ ] **Step 3: Test drag interaction on desktop**

```bash
npm run dev
```

Open `http://localhost:3000/demo`:
1. Select "Available" mode → drag across cells → they turn green
2. Select "If Needed" mode → drag across cells → they turn amber
3. Select "Unavailable" mode → drag across cells → they reset to gray (eraser)
4. Check JSON output below grid updates in real time

- [ ] **Step 4: Test on mobile (or Chrome DevTools mobile emulation)**

Open Chrome DevTools → Toggle device toolbar → Select iPhone 14 Pro.
1. Tap and drag on grid — cells should paint without page scrolling
2. Switch modes and drag again — mode change works
3. Grid should show 7 columns without horizontal scroll

- [ ] **Step 5: Commit**

```bash
git add src/components/drag-grid/
git commit -m "feat: add touch + mouse drag interaction to availability grid"
```

---

## Task 4: Supabase Schema Setup

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create migration file**

```bash
mkdir -p supabase/migrations
```

Create `supabase/migrations/001_initial_schema.sql`:
```sql
-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Events table
CREATE TABLE events (
  id TEXT PRIMARY KEY,                    -- nanoid, not UUID
  title TEXT NOT NULL,
  dates DATE[] NOT NULL,
  time_start SMALLINT NOT NULL DEFAULT 18,  -- 09:00
  time_end SMALLINT NOT NULL DEFAULT 42,    -- 21:00
  password_hash TEXT,                       -- bcrypt hash, nullable
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  availability JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast participant lookup by event
CREATE INDEX idx_participants_event_id ON participants(event_id);

-- Index for token-based auth
CREATE INDEX idx_participants_token ON participants(token);

-- RLS policies: all public access via anon key
-- Actual authorization happens in Next.js API routes using service role key
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Allow public read on events
CREATE POLICY "events_select" ON events FOR SELECT USING (true);

-- Allow public insert on events
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (true);

-- Allow public read on participants
CREATE POLICY "participants_select" ON participants FOR SELECT USING (true);

-- Allow public insert on participants
CREATE POLICY "participants_insert" ON participants FOR INSERT WITH CHECK (true);

-- Updates go through service role key (bypasses RLS), so no update policy needed for anon

-- Enable realtime for participants table
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
```

- [ ] **Step 2: Run migration in Supabase Dashboard**

Go to Supabase Dashboard → SQL Editor → paste and run the migration.
Alternatively, if using Supabase CLI:
```bash
npx supabase db push
```

- [ ] **Step 3: Set up `.env.local` with real Supabase credentials**

Copy `.env.local.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` from Supabase Dashboard → Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` from same location
- `SUPABASE_SERVICE_ROLE_KEY` from same location (keep secret!)

- [ ] **Step 4: Commit migration**

```bash
git add supabase/
git commit -m "feat: add Supabase schema for events and participants"
```

---

## Task 5: API Routes — Event CRUD

**Files:**
- Create: `src/app/api/events/route.ts`
- Create: `src/app/api/events/[id]/route.ts`
- Create: `src/app/api/events/[id]/verify/route.ts`

- [ ] **Step 1: Create event creation endpoint**

Create `src/app/api/events/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, dates, time_start, time_end, password } = body;

  if (!title || !dates || !Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json({ error: 'Title and dates are required' }, { status: 400 });
  }

  const id = nanoid(10);
  const supabase = createServerClient();

  const eventData: Record<string, unknown> = {
    id,
    title: title.trim(),
    dates,
    time_start: time_start ?? 18,
    time_end: time_end ?? 42,
  };

  if (password) {
    eventData.password_hash = await bcrypt.hash(password, 10);
  }

  const { error } = await supabase.from('events').insert(eventData);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id }, { status: 201 });
}
```

- [ ] **Step 2: Create event retrieval endpoint**

Create `src/app/api/events/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: event, error } = await supabase
    .from('events')
    .select('id, title, dates, time_start, time_end, created_at, password_hash')
    .eq('id', id)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Check if password-protected event requires verification
  const hasPassword = !!event.password_hash;
  if (hasPassword) {
    const cookie = request.cookies.get(`whenmeets_auth_${id}`);
    if (!cookie || cookie.value !== 'verified') {
      return NextResponse.json({
        id: event.id,
        title: event.title,
        has_password: true,
        requires_auth: true,
      });
    }
  }

  // Fetch participants
  const { data: participants } = await supabase
    .from('participants')
    .select('id, name, availability, created_at')
    .eq('event_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    id: event.id,
    title: event.title,
    dates: event.dates,
    time_start: event.time_start,
    time_end: event.time_end,
    has_password: hasPassword,
    created_at: event.created_at,
    participants: participants ?? [],
  });
}
```

- [ ] **Step 3: Create password verification endpoint**

Create `src/app/api/events/[id]/verify/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { password } = await request.json();

  if (!password) {
    return NextResponse.json({ error: 'Password required' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: event } = await supabase
    .from('events')
    .select('password_hash')
    .eq('id', id)
    .single();

  if (!event?.password_hash) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const valid = await bcrypt.compare(password, event.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(`whenmeets_auth_${id}`, 'verified', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 86400, // 24 hours
    path: `/e/${id}`,
  });

  return response;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/events/
git commit -m "feat: add event creation, retrieval, and password verification API routes"
```

---

## Task 6: API Routes — Participants

**Files:**
- Create: `src/app/api/events/[id]/participants/route.ts`
- Create: `src/app/api/events/[id]/participants/[pid]/route.ts`
- Create: `src/app/api/events/[id]/results/route.ts`

- [ ] **Step 1: Create participant join endpoint**

Create `src/app/api/events/[id]/participants/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name } = await request.json();

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Check event exists
  const { data: event } = await supabase
    .from('events')
    .select('id, password_hash')
    .eq('id', id)
    .single();

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Check password auth if needed
  if (event.password_hash) {
    const cookie = request.cookies.get(`whenmeets_auth_${id}`);
    if (!cookie || cookie.value !== 'verified') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
  }

  // Check for existing participant with same name (case-insensitive)
  const { data: existing } = await supabase
    .from('participants')
    .select('id, token')
    .eq('event_id', id)
    .ilike('name', name.trim())
    .single();

  if (existing) {
    // Return existing participant for overwrite flow
    return NextResponse.json({
      id: existing.id,
      token: existing.token,
      existing: true,
    });
  }

  // Create new participant
  const { data: participant, error } = await supabase
    .from('participants')
    .insert({
      event_id: id,
      name: name.trim(),
      availability: {},
    })
    .select('id, token')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: participant!.id,
    token: participant!.token,
    existing: false,
  }, { status: 201 });
}
```

- [ ] **Step 2: Create availability update endpoint**

Create `src/app/api/events/[id]/participants/[pid]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const { id, pid } = await params;
  const token = request.headers.get('X-Participant-Token');

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 401 });
  }

  const supabase = createServerClient();

  // Verify token matches participant
  const { data: participant } = await supabase
    .from('participants')
    .select('id, token')
    .eq('id', pid)
    .eq('event_id', id)
    .single();

  if (!participant || participant.token !== token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { availability } = await request.json();

  const { error } = await supabase
    .from('participants')
    .update({ availability })
    .eq('id', pid);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create results aggregation endpoint**

Create `src/app/api/events/[id]/results/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, title, dates, time_start, time_end, password_hash')
    .eq('id', id)
    .single();

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Password check
  if (event.password_hash) {
    const cookie = request.cookies.get(`whenmeets_auth_${id}`);
    if (!cookie || cookie.value !== 'verified') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
  }

  const { data: participants } = await supabase
    .from('participants')
    .select('id, name, availability')
    .eq('event_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      dates: event.dates,
      time_start: event.time_start,
      time_end: event.time_end,
    },
    participants: participants ?? [],
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/events/
git commit -m "feat: add participant join, availability update, and results API routes"
```

---

## Task 7: Event Creation Page

**Files:**
- Create: `src/components/event-form/DatePicker.tsx`
- Create: `src/components/event-form/TimeRangePicker.tsx`
- Create: `src/components/event-form/EventForm.tsx`
- Modify: `src/app/new/page.tsx`

- [ ] **Step 1: Create DatePicker component**

Create `src/components/event-form/DatePicker.tsx`:
```tsx
'use client';

import { useState } from 'react';

interface DatePickerProps {
  selectedDates: string[];
  onDatesChange: (dates: string[]) => void;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function DatePicker({ selectedDates, onDatesChange }: DatePickerProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const days = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  function toggleDate(dateStr: string) {
    if (selectedDates.includes(dateStr)) {
      onDatesChange(selectedDates.filter((d) => d !== dateStr));
    } else {
      onDatesChange([...selectedDates, dateStr].sort());
    }
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  const todayStr = formatDateISO(today);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          &larr;
        </button>
        <span className="font-medium text-sm">{monthLabel}</span>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          &rarr;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const dateStr = formatDateISO(day);
          const isPast = dateStr < todayStr;
          const isSelected = selectedDates.includes(dateStr);

          return (
            <button
              key={dateStr}
              onClick={() => !isPast && toggleDate(dateStr)}
              disabled={isPast}
              className={`h-9 rounded-lg text-sm font-medium transition-colors
                ${isPast ? 'text-gray-200 cursor-not-allowed' : ''}
                ${isSelected ? 'bg-emerald-500 text-white' : ''}
                ${!isSelected && !isPast ? 'hover:bg-gray-100 text-gray-700' : ''}`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create TimeRangePicker component**

Create `src/components/event-form/TimeRangePicker.tsx`:
```tsx
'use client';

import { slotToTime } from '@/lib/constants';

interface TimeRangePickerProps {
  timeStart: number;
  timeEnd: number;
  onTimeStartChange: (slot: number) => void;
  onTimeEndChange: (slot: number) => void;
}

// Generate options: every hour from 00:00 to 24:00
function generateTimeOptions(): { value: number; label: string }[] {
  const options: { value: number; label: string }[] = [];
  for (let slot = 0; slot <= 48; slot += 2) {
    options.push({ value: slot, label: slotToTime(slot) });
  }
  return options;
}

export default function TimeRangePicker({
  timeStart,
  timeEnd,
  onTimeStartChange,
  onTimeEndChange,
}: TimeRangePickerProps) {
  const options = generateTimeOptions();

  return (
    <div className="flex items-center gap-3">
      <select
        value={timeStart}
        onChange={(e) => onTimeStartChange(Number(e.target.value))}
        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.value >= timeEnd}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="text-gray-400">~</span>
      <select
        value={timeEnd}
        onChange={(e) => onTimeEndChange(Number(e.target.value))}
        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.value <= timeStart}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 3: Create EventForm component**

Create `src/components/event-form/EventForm.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from './DatePicker';
import TimeRangePicker from './TimeRangePicker';

export default function EventForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  const [timeStart, setTimeStart] = useState(18); // 09:00
  const [timeEnd, setTimeEnd] = useState(42);     // 21:00
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (dates.length === 0) {
      setError('Select at least one date');
      return;
    }

    setSubmitting(true);
    setError('');

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        dates,
        time_start: timeStart,
        time_end: timeEnd,
        password: password || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to create event');
      setSubmitting(false);
      return;
    }

    const { id } = await res.json();
    router.push(`/e/${id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          className="w-full px-4 py-3 text-lg border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          maxLength={100}
        />
      </div>

      {/* Date picker */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">
          Dates {dates.length > 0 && `(${dates.length} selected)`}
        </label>
        <DatePicker selectedDates={dates} onDatesChange={setDates} />
      </div>

      {/* Time range */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">
          Time range
        </label>
        <TimeRangePicker
          timeStart={timeStart}
          timeEnd={timeEnd}
          onTimeStartChange={setTimeStart}
          onTimeEndChange={setTimeEnd}
        />
      </div>

      {/* Optional password */}
      <div>
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {showPassword ? 'Remove password' : '+ Add password (optional)'}
        </button>
        {showPassword && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="mt-2 w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
      >
        {submitting ? 'Creating...' : 'Create Event'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Create the `/new` page**

Create `src/app/new/page.tsx`:
```tsx
import EventForm from '@/components/event-form/EventForm';

export default function NewEventPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Create Event</h1>
      <EventForm />
    </div>
  );
}
```

- [ ] **Step 5: Verify form renders and validation works**

```bash
npm run dev
```

Open `http://localhost:3000/new`:
1. Submit empty form → error message appears
2. Fill title, select dates, submit → redirects to `/e/[nanoid]` (will 404 until Task 8, but event should be in Supabase)

- [ ] **Step 6: Commit**

```bash
git add src/components/event-form/ src/app/new/
git commit -m "feat: add event creation page with date picker and time range selector"
```

---

## Task 8: Event Participation Page

**Files:**
- Create: `src/app/e/[id]/page.tsx`

This page handles: name entry → grid input → save availability. It also handles password-protected events.

- [ ] **Step 1: Create the event participation page**

Create `src/app/e/[id]/page.tsx`:
```tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Availability, Event, Participant } from '@/lib/types';
import DragGrid from '@/components/drag-grid/DragGrid';

type PageState = 'loading' | 'password' | 'name' | 'grid' | 'error';

interface EventData extends Event {
  participants: Pick<Participant, 'id' | 'name' | 'availability' | 'created_at'>[];
  requires_auth?: boolean;
}

export default function EventPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [state, setState] = useState<PageState>('loading');
  const [event, setEvent] = useState<EventData | null>(null);
  const [error, setError] = useState('');

  // Participant state
  const [name, setName] = useState('');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participantToken, setParticipantToken] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Availability>({});
  const [saving, setSaving] = useState(false);

  // Password state
  const [password, setPassword] = useState('');

  // Debounce save
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load event
  useEffect(() => {
    async function loadEvent() {
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) {
        setError('Event not found');
        setState('error');
        return;
      }
      const data: EventData = await res.json();
      if (data.requires_auth) {
        setState('password');
        setEvent(data);
        return;
      }
      setEvent(data);

      // Check localStorage for existing participation
      const stored = localStorage.getItem(`whenmeets:${eventId}`);
      if (stored) {
        const { participantId: pid, token } = JSON.parse(stored);
        // Find this participant in the list
        const existing = data.participants.find((p) => p.id === pid);
        if (existing) {
          setParticipantId(pid);
          setParticipantToken(token);
          setAvailability(existing.availability);
          setState('grid');
          return;
        }
      }
      setState('name');
    }
    loadEvent();
  }, [eventId]);

  // Password submit
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/events/${eventId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError('Wrong password');
      return;
    }
    setError('');
    // Reload event data (now authenticated via cookie)
    const eventRes = await fetch(`/api/events/${eventId}`);
    const data: EventData = await eventRes.json();
    setEvent(data);

    const stored = localStorage.getItem(`whenmeets:${eventId}`);
    if (stored) {
      const { participantId: pid, token } = JSON.parse(stored);
      const existing = data.participants.find((p) => p.id === pid);
      if (existing) {
        setParticipantId(pid);
        setParticipantToken(token);
        setAvailability(existing.availability);
        setState('grid');
        return;
      }
    }
    setState('name');
  }

  // Name submit
  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const res = await fetch(`/api/events/${eventId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });

    if (!res.ok) {
      setError('Failed to join event');
      return;
    }

    const data = await res.json();
    setParticipantId(data.id);
    setParticipantToken(data.token);

    // Store token in localStorage
    localStorage.setItem(
      `whenmeets:${eventId}`,
      JSON.stringify({ participantId: data.id, token: data.token })
    );

    // If existing participant, load their availability
    if (data.existing) {
      const existingParticipant = event?.participants.find((p) => p.id === data.id);
      if (existingParticipant) {
        setAvailability(existingParticipant.availability);
      }
    }

    setState('grid');
  }

  // Save availability with debounce
  const saveAvailability = useCallback(
    async (newAvailability: Availability) => {
      if (!participantId || !participantToken) return;

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        setSaving(true);
        await fetch(`/api/events/${eventId}/participants/${participantId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Participant-Token': participantToken,
          },
          body: JSON.stringify({ availability: newAvailability }),
        });
        setSaving(false);
      }, 500);
    },
    [eventId, participantId, participantToken]
  );

  function handleAvailabilityChange(newAvailability: Availability) {
    setAvailability(newAvailability);
    saveAvailability(newAvailability);
  }

  // --- Render ---

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p className="text-gray-500">{error || 'Something went wrong'}</p>
        <Link href="/" className="mt-4 text-emerald-500 hover:underline">
          Go home
        </Link>
      </div>
    );
  }

  if (state === 'password') {
    return (
      <div className="max-w-sm mx-auto px-4 py-16">
        <h1 className="text-xl font-bold mb-1">{event?.title}</h1>
        <p className="text-sm text-gray-500 mb-6">This event requires a password.</p>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  if (state === 'name') {
    return (
      <div className="max-w-sm mx-auto px-4 py-16">
        <h1 className="text-xl font-bold mb-1">{event?.title}</h1>
        <p className="text-sm text-gray-500 mb-6">
          {event?.participants.length ?? 0} participant{(event?.participants.length ?? 0) !== 1 ? 's' : ''} so far
        </p>
        <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            maxLength={50}
            autoFocus
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
          >
            Join
          </button>
        </form>
      </div>
    );
  }

  // state === 'grid'
  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold">{event?.title}</h1>
          <p className="text-xs text-gray-400">
            {saving ? 'Saving...' : 'Auto-saved'}
          </p>
        </div>
        <Link
          href={`/e/${eventId}/results`}
          className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
        >
          View Results
        </Link>
      </div>

      <DragGrid
        dates={event?.dates ?? []}
        timeStart={event?.time_start ?? 18}
        timeEnd={event?.time_end ?? 42}
        availability={availability}
        onAvailabilityChange={handleAvailabilityChange}
      />

      {/* Share link */}
      <div className="mt-6 p-3 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-500 mb-2">Share this link:</p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={typeof window !== 'undefined' ? window.location.href : ''}
            className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg"
          />
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the participation flow**

```bash
npm run dev
```

1. Create an event at `/new`
2. Should redirect to `/e/[id]`
3. Enter name → grid appears
4. Drag to set availability → "Saving..." appears briefly → "Auto-saved"
5. Click "View Results" (will be empty until Task 9)
6. Refresh page → grid loads with saved availability (from localStorage token)

- [ ] **Step 3: Commit**

```bash
git add src/app/e/
git commit -m "feat: add event participation page with name entry, password gate, and auto-save"
```

---

## Task 9: Results Page

**Files:**
- Create: `src/components/results/HeatmapGrid.tsx`
- Create: `src/components/results/ParticipantFilter.tsx`
- Create: `src/app/e/[id]/results/page.tsx`

- [ ] **Step 1: Create HeatmapGrid component**

Create `src/components/results/HeatmapGrid.tsx`:
```tsx
'use client';

import { Participant } from '@/lib/types';
import { generateSlots, slotToTime, formatDateCompact } from '@/lib/constants';

interface HeatmapGridProps {
  dates: string[];
  timeStart: number;
  timeEnd: number;
  participants: Pick<Participant, 'id' | 'name' | 'availability'>[];
  selectedIds: Set<string>;
  includeIfNeeded: boolean;
}

export default function HeatmapGrid({
  dates,
  timeStart,
  timeEnd,
  participants,
  selectedIds,
  includeIfNeeded,
}: HeatmapGridProps) {
  const slots = generateSlots(timeStart, timeEnd);
  const filtered = participants.filter((p) => selectedIds.has(p.id));
  const total = filtered.length;

  function getCount(date: string, slot: number): number {
    let count = 0;
    for (const p of filtered) {
      const val = p.availability?.[date]?.[String(slot)];
      if (val === 2) count++;
      else if (val === 1 && includeIfNeeded) count++;
    }
    return count;
  }

  function getColor(count: number): string {
    if (total === 0 || count === 0) return 'bg-gray-50';
    const ratio = count / total;
    if (ratio <= 0.25) return 'bg-emerald-100';
    if (ratio <= 0.5) return 'bg-emerald-200';
    if (ratio <= 0.75) return 'bg-emerald-400';
    return 'bg-emerald-500';
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex">
        {/* Time labels */}
        <div className="flex flex-col pt-[28px]">
          {slots.map((slot) => (
            <div
              key={slot}
              className="h-[20px] pr-2 text-[10px] text-gray-400 text-right leading-[20px]"
            >
              {slot % 2 === 0 ? slotToTime(slot) : ''}
            </div>
          ))}
        </div>

        {/* Date columns */}
        {dates.map((date) => (
          <div key={date} className="flex flex-col">
            <div className="h-[28px] text-xs font-medium text-gray-600 text-center leading-[28px]">
              {formatDateCompact(date)}
            </div>
            {slots.map((slot) => {
              const count = getCount(date, slot);
              return (
                <div
                  key={`${date}-${slot}`}
                  className={`w-[44px] h-[20px] border-r border-gray-200 ${getColor(count)} flex items-center justify-center transition-colors
                    ${slot % 2 === 0 ? 'border-t border-gray-300' : 'border-t border-gray-100'}`}
                >
                  {count > 0 && (
                    <span className={`text-[9px] font-medium ${count === total ? 'text-white' : 'text-gray-600'}`}>
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ParticipantFilter component**

Create `src/components/results/ParticipantFilter.tsx`:
```tsx
'use client';

interface ParticipantFilterProps {
  participants: { id: string; name: string }[];
  selectedIds: Set<string>;
  onSelectedChange: (ids: Set<string>) => void;
}

export default function ParticipantFilter({
  participants,
  selectedIds,
  onSelectedChange,
}: ParticipantFilterProps) {
  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectedChange(next);
  }

  function selectAll() {
    onSelectedChange(new Set(participants.map((p) => p.id)));
  }

  function selectNone() {
    onSelectedChange(new Set());
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-600">Participants</span>
        <button onClick={selectAll} className="text-xs text-emerald-500 hover:underline">
          All
        </button>
        <button onClick={selectNone} className="text-xs text-gray-400 hover:underline">
          None
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {participants.map((p) => (
          <button
            key={p.id}
            onClick={() => toggle(p.id)}
            className={`px-3 py-1 text-sm rounded-full transition-colors
              ${selectedIds.has(p.id)
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-400'}`}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create results page**

Create `src/app/e/[id]/results/page.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Participant } from '@/lib/types';
import HeatmapGrid from '@/components/results/HeatmapGrid';
import ParticipantFilter from '@/components/results/ParticipantFilter';

interface ResultsData {
  event: {
    id: string;
    title: string;
    dates: string[];
    time_start: number;
    time_end: number;
  };
  participants: Pick<Participant, 'id' | 'name' | 'availability'>[];
}

export default function ResultsPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [data, setData] = useState<ResultsData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [includeIfNeeded, setIncludeIfNeeded] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/events/${eventId}/results`);
      if (!res.ok) {
        setError('Could not load results');
        return;
      }
      const d: ResultsData = await res.json();
      setData(d);
      setSelectedIds(new Set(d.participants.map((p) => p.id)));
    }
    load();
  }, [eventId]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">{data.event.title}</h1>
        <Link
          href={`/e/${eventId}`}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Edit Mine
        </Link>
      </div>

      {data.participants.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No responses yet.</p>
      ) : (
        <>
          <ParticipantFilter
            participants={data.participants}
            selectedIds={selectedIds}
            onSelectedChange={setSelectedIds}
          />

          <div className="mt-3 flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={includeIfNeeded}
                onChange={(e) => setIncludeIfNeeded(e.target.checked)}
                className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
              />
              Include &quot;If Needed&quot;
            </label>
          </div>

          <div className="mt-4">
            <HeatmapGrid
              dates={data.event.dates}
              timeStart={data.event.time_start}
              timeEnd={data.event.time_end}
              participants={data.participants}
              selectedIds={selectedIds}
              includeIfNeeded={includeIfNeeded}
            />
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-gray-50 border border-gray-200" />
              <span>0</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-200" />
              <span>Some</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span>All</span>
            </div>
          </div>
        </>
      )}

      {/* Share link */}
      <div className="mt-6 p-3 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-500 mb-2">Share this event:</p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={typeof window !== 'undefined' ? `${window.location.origin}/e/${eventId}` : ''}
            className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg"
          />
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/e/${eventId}`)}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Test full flow**

```bash
npm run dev
```

1. Create event at `/new`
2. Enter name, fill availability grid
3. Click "View Results" → heatmap with your data
4. Open same event URL in incognito → enter different name → fill different availability
5. Results page now shows 2 participants with combined heatmap
6. Filter participants, toggle "Include If Needed"

- [ ] **Step 5: Commit**

```bash
git add src/components/results/ src/app/e/
git commit -m "feat: add results page with heatmap grid, participant filter, and if-needed toggle"
```

---

## Task 10: Realtime Updates

**Files:**
- Modify: `src/app/e/[id]/page.tsx` (add realtime subscription)
- Modify: `src/app/e/[id]/results/page.tsx` (add realtime subscription)

- [ ] **Step 1: Add realtime subscription to event page**

Add this to `src/app/e/[id]/page.tsx` after the `loadEvent` useEffect:

```tsx
// Add import at top:
import { createBrowserClient } from '@/lib/supabase/client';

// Add after existing useEffect:
useEffect(() => {
  if (state !== 'grid' || !event) return;

  const supabase = createBrowserClient();
  const channel = supabase
    .channel(`event-${eventId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `event_id=eq.${eventId}`,
      },
      () => {
        // Refresh event data when any participant changes
        fetch(`/api/events/${eventId}`)
          .then((res) => res.json())
          .then((data) => {
            if (!data.requires_auth) setEvent(data);
          });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [state, eventId, event]);
```

- [ ] **Step 2: Add realtime subscription to results page**

Add this to `src/app/e/[id]/results/page.tsx` after the initial load useEffect:

```tsx
// Add import at top:
import { createBrowserClient } from '@/lib/supabase/client';

// Add after existing useEffect:
useEffect(() => {
  if (!data) return;

  const supabase = createBrowserClient();
  const channel = supabase
    .channel(`results-${eventId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `event_id=eq.${eventId}`,
      },
      () => {
        // Re-fetch results
        fetch(`/api/events/${eventId}/results`)
          .then((res) => res.json())
          .then((d: ResultsData) => {
            setData(d);
            // Add any new participants to selection
            setSelectedIds((prev) => {
              const next = new Set(prev);
              d.participants.forEach((p) => next.add(p.id));
              return next;
            });
          });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [data, eventId]);
```

- [ ] **Step 3: Test realtime**

1. Open event in two browser tabs
2. Tab A: fill availability → Tab B results page should update without refresh
3. If Realtime fails (check console), the page still works via manual refresh

- [ ] **Step 4: Commit**

```bash
git add src/app/e/
git commit -m "feat: add Supabase Realtime subscriptions for live participant updates"
```

---

## Task 11: Polish + Error States

**Files:**
- Modify: `src/app/layout.tsx` (add viewport meta for mobile)
- Modify: `src/app/page.tsx` (improve landing)
- Create: `src/app/not-found.tsx`
- Delete: `src/app/demo/page.tsx` (cleanup)

- [ ] **Step 1: Add mobile viewport meta**

In `src/app/layout.tsx`, update the metadata export:
```tsx
export const metadata: Metadata = {
  title: 'WhenMeets - Group Scheduling Made Easy',
  description: 'Free, modern alternative to when2meet. Mobile-friendly drag grid for group scheduling.',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1, // Prevent zoom during grid drag on iOS
  },
};
```

Note: Next.js 15 may export viewport separately:
```tsx
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};
```

- [ ] **Step 2: Create 404 page**

Create `src/app/not-found.tsx`:
```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-4xl font-bold text-gray-200">404</h1>
      <p className="mt-2 text-gray-500">Event not found.</p>
      <Link href="/" className="mt-4 text-emerald-500 hover:underline">
        Create a new event
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Delete demo page**

```bash
rm -rf src/app/demo
```

- [ ] **Step 4: Improve landing page**

Update `src/app/page.tsx`:
```tsx
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-4xl font-bold tracking-tight">WhenMeets</h1>
      <p className="mt-3 text-lg text-gray-500 text-center max-w-xs">
        Group scheduling, actually usable on mobile. Free and open source.
      </p>
      <Link
        href="/new"
        className="mt-8 px-8 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors text-lg"
      >
        Create Event
      </Link>
      <p className="mt-12 text-xs text-gray-300">
        No account needed. Share a link, pick times, done.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Verify responsive layout**

```bash
npm run dev
```

Test at these breakpoints in Chrome DevTools:
- iPhone SE (375px): Grid fits 7 columns, no horizontal scroll
- iPhone 14 (390px): Same
- iPad (768px): Comfortable spacing
- Desktop (1024px+): Centered layout, readable

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add mobile viewport, 404 page, polish landing page, remove demo"
```

---

## Task 12: Vercel Deployment

**Files:**
- Verify: `next.config.ts` (default should work)
- Verify: `.env.local` is in `.gitignore`

- [ ] **Step 1: Verify build succeeds locally**

```bash
npm run build
```

Fix any TypeScript errors or build warnings.

- [ ] **Step 2: Deploy to Vercel**

```bash
npx vercel --prod
```

Or connect the GitHub repo in Vercel Dashboard for automatic deploys.

Set environment variables in Vercel Dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Step 3: Test production deployment**

1. Open the Vercel URL on mobile
2. Create event → enter name → drag grid → view results
3. Share link with someone else → they can participate
4. Password-protected event works

- [ ] **Step 4: Commit any build fixes**

```bash
git add -A
git commit -m "fix: resolve build issues for production deployment"
```

---

---

## CEO Review Outputs (Phase 1 — /autoplan)

### NOT in scope (deferred)
- Google AdSense integration
- "Results first" UX experiment
- Unavailable time input mode
- Calendar integration (Google Calendar, Outlook)
- Timezone support
- MCP server
- Screenshot capture sharing
- Data retention policy (90-day cleanup cron)
- PWA manifest / add-to-homescreen
- Loading skeleton animations
- Reminder system for unfilled participants
- Recurring group / team workspace features

### What already exists
| Sub-problem | Existing code |
|---|---|
| Touch drag grid | None (greenfield) |
| Supabase CRUD | None |
| All UI pages | None |
| Realtime sync | None |

External reference: Crab Fit (MIT) schema design as inspiration only.

### Accepted Scope Expansions
1. **OG meta tags** for KakaoTalk/messaging link previews (1 file)
2. **Rate limiting middleware** on API routes (1 file)
3. **Copy feedback toast** on URL copy (1-line change)

### Error & Rescue Registry

| Method/Codepath | What Can Go Wrong | Handled? | Fix |
|---|---|---|---|
| POST /api/events | bcrypt failure | N | Add try/catch, return 500 |
| All API routes | Supabase connection failure | N | Add specific error message |
| Debounced save | Page close during debounce | N | Add beforeunload flush |
| Debounced save | Network failure | N | Add error indicator |
| Realtime subscription | WebSocket failure | N | Add polling fallback |

### Failure Modes Registry

| Failure Mode | Severity | Plan Mitigates? | Gap? |
|---|---|---|---|
| Save data lost on page close | HIGH | No | Yes — beforeunload handler needed |
| Silent save failure (no error UI) | HIGH | No | Yes — error indicator needed |
| Realtime disconnection | MEDIUM | Mentioned in design doc, not in plan | Yes — polling fallback |
| Server-side validation bypass | MEDIUM | Partial (client validates, server doesn't fully) | Yes — add server validation |
| No logging in API routes | LOW | No | Yes — add console.error |

### Dream State Delta
This plan gets us from empty repo to working MVP (create → participate → results). That's ~60% of the 12-month ideal. Missing: calendar sync, timezone, PWA, growth mechanics. All correctly deferred.

### CEO Completion Summary

| Section | Findings | Auto-decided | Taste |
|---|---|---|---|
| 0A Premises | 3 premises, all valid | Accepted (P6) | "If Needed" 3-state questioned |
| 0B Existing Code | Greenfield, no reuse | N/A | — |
| 0C Dream State | 60% toward ideal | N/A | — |
| 0C-bis Alternatives | 3 approaches, A selected | Accepted (P3) | — |
| 0D Selective Expansion | 5 candidates, 3 accepted | OG/rate-limit/toast (P1,P2) | — |
| 0E Temporal | TailwindCSS v4 config issue found | Flagged | — |
| 1 Architecture | Clean, appropriate | No issues | — |
| 2 Error & Rescue | 5 gaps found | All accepted (P1) | — |
| 3 Security | Input validation gaps | Accept add server validation (P1) | — |
| 4 Data Flow | Page close data loss | Flagged in Sec 2 | — |
| 5 Code Quality | No tests, share link DRY | Flagged | Test scope is taste |
| 6 Test Review | 0% coverage | Flagged | How much testing? |
| 7 Performance | No issues | — | — |
| 8 Observability | No logging, no save error UI | Accept add (P5) | — |
| 9 Deployment | Manual migration | OK for MVP (P3) | — |
| 10 Long-term | No issues, 5/5 reversibility | — | — |
| 11 Design/UX | Grid save error state missing | Accept add (P1) | — |

### Dual Voice Summary [subagent-only]
Claude subagent raised 5 strategic concerns. Key tension: subagent sees this as a startup product needing viral mechanics and competitive moats. But the user defined this as a personal side project solving their own problem. Subagent findings are valid strategic observations but not blocking for this context.

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|---------------|-----------|-----------|----------|
| 1 | CEO | Accept premises P1-P3 | Mechanical | P6 (action) | All premises grounded in design doc | — |
| 2 | CEO | Mode: SELECTIVE EXPANSION | Mechanical | autoplan override | Per autoplan spec | EXPANSION |
| 3 | CEO | Approach A (drag-first) | Mechanical | P3 (pragmatic) | De-risks hardest part first | Approach B, C |
| 4 | CEO | Accept OG tags expansion | Mechanical | P1 (completeness) | Essential for KakaoTalk sharing | — |
| 5 | CEO | Defer PWA manifest | Mechanical | P3 (pragmatic) | Not MVP-blocking | — |
| 6 | CEO | Accept rate limiting | Mechanical | P1 (completeness) | Security baseline | — |
| 7 | CEO | Defer loading skeletons | Taste | P3 vs P1 | Minor UX, debatable | — |
| 8 | CEO | Accept copy toast | Mechanical | P1 (completeness) | 1-line change, instant UX win | — |
| 9 | CEO | Add beforeunload save | Mechanical | P1 (completeness) | Real data loss risk | — |
| 10 | CEO | Add server-side validation | Mechanical | P1 (completeness) | Security gap | — |
| 11 | CEO | Add error indicator for saves | Mechanical | P1 (completeness) | Silent failure | — |
| 12 | CEO | Add console.error logging | Mechanical | P5 (explicit) | Debuggability baseline | — |
| 13 | CEO | Test scope for MVP | Taste | P1 vs P6 | How much testing? User decides | — |
| 14 | CEO | 3-state vs 2-state availability | Taste | User's design choice | Subagent questions, user decided in OH | Binary |
| 15 | CEO | Premises confirmed by user | Gate | User decision | 3-state from Timeful concept (AGPL code not used) | — |
| 16 | Design | Focus: all 7 dimensions | Mechanical | P1 (completeness) | UI-first product needs full review | — |
| 17 | Design | Add save error indicator | Mechanical | P1 (completeness) | Silent save failure is critical UX bug | — |
| 18 | Design | Add "Copied!" feedback | Mechanical | P1 (completeness) | 1-line change, instant feedback | — |
| 19 | Design | Add "Welcome back" toast | Mechanical | P1 (completeness) | Name collision UX gap | — |
| 20 | Design | Add password verify spinner | Mechanical | P1 (completeness) | Loading state gap | — |
| 21 | Design | Add "No participants selected" | Mechanical | P1 (completeness) | Empty filter state | — |
| 22 | Design | Add first-time grid instruction | Mechanical | P5 (explicit) | New users won't know to drag | — |
| 23 | Design | Skip formal design system | Mechanical | P3 (pragmatic) | Premature for solo MVP | DESIGN.md |
| 24 | Design | A11y scope for MVP | Taste | P1 vs P6 | ARIA labels yes, keyboard nav post-MVP | Full a11y |
| 25 | Design | Non-passive touchmove listener | Mechanical | P1 (completeness) | React passive default breaks Android drag | — |
| 26 | Design | Max 14 dates in DatePicker | Mechanical | P1 (completeness) | Overflow prevention | — |
| 27 | Design | Add "N of M responded" to results | Mechanical | P1 (completeness) | Context for solo respondent | — |
| 28 | Eng | Fix cookie path to '/' | Mechanical | P1 (completeness) | CRITICAL: password events completely broken | path=/e/${id} |
| 29 | Eng | Fix .single() to .maybeSingle() | Mechanical | P1 (completeness) | HIGH: duplicate names crash with 500 | .single() |
| 30 | Eng | Fix formatDateCompact to use UTC | Mechanical | P1 (completeness) | Date headers off by one for non-UTC users | local time |
| 31 | Eng | Clear stale localStorage token | Mechanical | P1 (completeness) | Orphaned tokens confuse returning users | — |
| 32 | Eng | Fix useGridDrag stale closure | Mechanical | P5 (explicit) | Realtime update during drag gets overwritten | — |
| 33 | Eng | Add JSONB size limit (50KB) | Mechanical | P1 (completeness) | Unbounded payload → DB bloat | — |
| 34 | Eng | Add rate limiting task | Mechanical | P2 (boil lakes) | Accepted in CEO but no task created | — |
| 35 | Eng | Add test task to plan | Mechanical | P1 (completeness) | 0% test coverage, security model untested | — |
| 36 | Eng | Non-passive touchmove (imperative) | Mechanical | P1 (completeness) | React passive default breaks Android drag | — |

---

## Eng Review Outputs (Phase 3 — /autoplan)

### Architecture Bugs Found

1. **[CRITICAL] Cookie path mismatch** — `verify/route.ts` sets cookie with `path: /e/${id}` but API routes are at `/api/events/${id}`. Browser never sends cookie to API. Fix: `path: '/'`.
2. **[HIGH] `.single()` crash on duplicate names** — `participants/route.ts` uses `ilike(name).single()`. Two participants named "Alex" → Supabase throws. Fix: use `.maybeSingle()`.
3. **[MEDIUM] Date off-by-one** — `formatDateCompact` uses `new Date(dateStr + 'T00:00:00')` (local time). In UTC+9, dates display correctly. For UTC-X users, day shifts backward. Fix: `'T00:00:00Z'`.
4. **[HIGH] Stale localStorage token** — If participant row is deleted, localStorage still has the old token. Silent re-join confusion. Fix: clear localStorage if stored pid not found.
5. **[HIGH] useGridDrag stale closure** — `handlePointerMove` doesn't include availability in deps. Realtime update during drag gets silently overwritten. Fix: use ref for activeMode.
6. **[HIGH] Unbounded JSONB payload** — No size limit on availability PATCH. Fix: reject if > 50KB.

### Test Coverage: 0%

Test plan artifact written to `~/.gstack/projects/BORB-CHOI-whenmeets/qzsec-main-eng-review-test-plan-20260404-034737.md`.

Priority tests needed:
1. Token auth (CRITICAL — entire security model)
2. Cookie path (CRITICAL — password flow broken)
3. Duplicate name handling (HIGH — 500 crash)
4. Utility functions (LOW — pure functions)

### Failure Modes Registry (Eng)

| Failure Mode | Severity | Plan Status | Gap? |
|---|---|---|---|
| Password event auth cookie not sent to API | CRITICAL | BUG in plan code | Fix cookie path |
| Duplicate names crash API | HIGH | BUG in plan code | Fix .single() |
| Drag doesn't prevent scroll on Android | HIGH | Noted but unfixed | Imperative listener |
| JSONB payload DoS | HIGH | Not addressed | Add size limit |
| Stale token confusion | HIGH | Not addressed | Clear on mismatch |
| Realtime overwrites mid-drag | MEDIUM | Not addressed | Use refs |
| Date headers wrong for non-UTC | MEDIUM | BUG in plan code | Use UTC |
| Rate limiting not implemented | MEDIUM | Accepted scope, no task | Add task |

### NOT in scope (Eng)
- E2E test framework setup (Playwright/Cypress)
- Load testing / stress testing
- Database migration tooling (Supabase CLI)
- CI/CD pipeline (GitHub Actions)
- Error tracking service (Sentry)

### What already exists (Eng)
Nothing. Greenfield repository.

### Eng Completion Summary

| Section | Findings | Auto-decided | Taste |
|---|---|---|---|
| 0 Scope Challenge | Greenfield, no reduction possible | OK (P2) | — |
| 1 Architecture | 4 bugs found (1 critical) | All fix (P1) | — |
| 2 Code Quality | 3 issues (DRY, closure, payload) | All fix (P1, P5) | — |
| 3 Test Review | 0% coverage, 25 untested paths | Add test task (P1) | Test depth is taste |
| 4 Performance | Realtime re-fetch at scale | OK for MVP (P3) | — |

### Cross-Phase Themes

**Theme: Save reliability** — flagged in CEO (beforeunload), Design (error indicator), Eng (debounce data loss). High-confidence signal. The save flow needs 3 fixes: beforeunload flush, error state UI, and network failure retry.

**Theme: Android touch scroll** — flagged in Design (non-passive listener) and Eng (React passive default). The core product experience (drag grid) is broken on Android Chrome without an imperative listener fix. High priority.

**Theme: Missing tests** — flagged in CEO (taste decision) and Eng (0% coverage). The token auth path is the entire security model and has zero tests. This crosses from "taste" to "must-have."
