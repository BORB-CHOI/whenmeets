---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "*.md"
---
# WhenMeets Project Conventions

## Design System Authority

DESIGN.md는 현재 없음 (코드와 불일치하여 삭제됨).
디자인 판단 시 실제 코드의 기존 패턴을 따를 것. 새로운 디자인 방향이 필요하면 사용자에게 확인.

## UI Component Library — Radix UI (shadcn 스타일)

복잡한 인터랙션 컴포넌트(Select, Dialog, Popover 등)는 `@radix-ui` 사용.
- Radix는 headless(unstyled) — Tailwind로 직접 스타일링
- shadcn/ui 디자인 패턴을 따름: `data-highlighted:`, `data-disabled:`, `data-[state=checked]:` 등 data attribute 기반 스타일
- Tailwind v4 정식 클래스명 사용: `data-disabled:` (O), `data-[disabled]:` (X)
- 현재 설치된 패키지: `@radix-ui/react-select`
- 새 Radix 패키지 추가 시 이 목록 업데이트할 것

## No Hardcoding

NEVER hardcode values that are defined in `src/lib/constants.ts`.

### Colors
- Use Tailwind utility classes matching existing code patterns
- Primary: `bg-emerald-600`, `text-emerald-700`, `border-emerald-500` (코드 기준)
- Grays: Tailwind gray scale (`gray-50` through `gray-900`)
- Availability: `AVAILABILITY_COLORS` from `src/lib/constants.ts`
- NEVER write raw hex (`#4F46E5`) or `rgba()` inline in JSX

### Spacing
- Use Tailwind spacing scale (`p-4`, `gap-6`, `mt-8`)

### Typography
- **Pretendard ONLY** — Geist Mono is BANNED
- Tabular number display: use `tabular-nums` CSS property with Pretendard

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
