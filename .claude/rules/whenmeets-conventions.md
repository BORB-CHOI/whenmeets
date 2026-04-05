---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "*.md"
---
# WhenMeets Project Conventions

## Design System Authority

DESIGN.md is the single source of truth for all visual decisions.
Read it BEFORE writing any UI code. Do not deviate without explicit user approval.

## No Hardcoding

NEVER hardcode values that are defined in DESIGN.md or `src/lib/constants.ts`.

### Colors
- Use Tailwind utility classes that match DESIGN.md tokens
- Primary: `bg-indigo-600`, `text-indigo-600`, `border-indigo-600`
- Grays: Tailwind gray scale (`gray-50` through `gray-900`)
- Availability: `AVAILABILITY_COLORS` from `src/lib/constants.ts`
- NEVER write raw hex (`#4F46E5`) or `rgba()` inline in JSX

### Spacing
- Use Tailwind spacing scale (`p-4`, `gap-6`, `mt-8`)
- Section padding: `py-12 md:py-16` (48px mobile / 64px desktop per DESIGN.md)
- Card padding: `p-4` (16px per DESIGN.md)

### Typography
- **Pretendard ONLY** — Geist Mono is BANNED
- Tabular number display: use `tabular-nums` CSS property with Pretendard
- Use Tailwind text sizes matching DESIGN.md

### Shared Constants (`src/lib/constants.ts`)
Before creating any new magic number or string, check if it already exists:
- `AVAILABILITY` — availability level enum (0, 1, 2)
- `AVAILABILITY_COLORS` — Tailwind classes for each level
- `MODE_LABELS` — Korean labels for each mode
- `SLOTS_PER_HOUR` — time slot granularity
- `slotToTime()` — slot index to "HH:MM"
- `formatDateCompact()` — date to "M/D day-of-week"
- `generateSlots()` — slot range generator

If a value appears in 2+ files, extract it to `constants.ts`.

## Animation (MANDATORY)

ALL show/hide transitions MUST have animation. No animation = bug.
Use Framer Motion `AnimatePresence` + `motion.div` for mount/unmount.

Standard pattern:
```tsx
<AnimatePresence>
  {show && (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
    >
      {content}
    </motion.div>
  )}
</AnimatePresence>
```

Easing: `cubic-bezier(0.4, 0, 0.2, 1)` per DESIGN.md.

## Layout Stability (MANDATORY)

- Modal height: ALWAYS fixed. Never use `h-auto` or `max-h-*` that causes layout shift.
- Calendar height: fixed regardless of month length.
- No layout shift on data load — use skeleton or fixed-size containers.

## Commit Messages

All commit messages MUST be written in Korean.

## Branch Workflow

Never commit directly to main. Always create a feature branch first:
- `feat/<task-name>` for features
- `fix/<task-name>` for bugfixes
