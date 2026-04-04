# 인증 리팩토링 + 그리드 UX 개선 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 토큰 기반 인증을 이름+비밀번호(선택) 기반으로 전환. 그리드 셀 높이/숫자 키우기. 편집 모드에서 응답자 목록 표시.

**Architecture:** 참가자 인증을 UUID 토큰에서 이름+비밀번호로 전환. DB의 token 컬럼을 password_hash로 교체. 클라이언트는 localStorage에 `{ participantId, name }` 저장. 수정 시 비밀번호 확인. 이름 중복 시 자동 넘버링.

**Tech Stack:** Next.js 15, React 19, Supabase, bcryptjs

**DB 초기화 허용:** 개발 단계이므로 마이그레이션으로 테이블 구조 변경 가능.

---

## File Map

| File | Role | Tasks |
|------|------|-------|
| `supabase/migrations/007_participant_password.sql` | **신규** — token→password 마이그레이션 | 1 |
| `src/app/api/events/[id]/participants/route.ts` | 참가자 생성 API | 1 |
| `src/app/api/events/[id]/participants/[pid]/route.ts` | 참가자 수정 API | 1 |
| `src/components/event-page/EventPageClient.tsx` | 이름 모달 + 편집 사이드바 | 2, 4 |
| `src/components/event-page/NameForm.tsx` | 이름 입력 (참고) | 2 |
| `src/hooks/useAvailabilitySave.ts` | 저장 훅 | 1 |
| `src/components/drag-grid/GridCell.tsx` | 편집 셀 렌더링 | 3 |
| `src/components/availability-grid/AvailabilityGrid.tsx` | 셀 높이 | 3 |
| `src/components/results/HeatmapGrid.tsx` | 히트맵 셀 렌더링 | 3 |

---

## Task 1: 인증 구조 변경 (토큰 → 이름+비밀번호)

**핵심 변경:** participants 테이블에서 `token UUID` 컬럼을 `password_hash TEXT` (nullable)로 교체. 비밀번호 없으면 이름만으로 접근 가능 (도용 허용). 비밀번호 있으면 수정 시 비밀번호 확인.

**Files:**
- Create: `supabase/migrations/007_participant_password.sql`
- Modify: `src/app/api/events/[id]/participants/route.ts`
- Modify: `src/app/api/events/[id]/participants/[pid]/route.ts`
- Modify: `src/hooks/useAvailabilitySave.ts`

### 마이그레이션

- [ ] **Step 1: DB 마이그레이션 파일 생성**

```sql
-- supabase/migrations/007_participant_password.sql
-- 토큰 기반 → 이름+비밀번호 기반 인증 전환

-- 기존 participants 데이터 삭제 (개발 단계)
TRUNCATE participants;

-- token 컬럼 제거
ALTER TABLE participants DROP COLUMN IF EXISTS token;
DROP INDEX IF EXISTS idx_participants_token;

-- password_hash 컬럼 추가 (nullable — 비밀번호 없으면 이름만으로 접근)
ALTER TABLE participants ADD COLUMN IF NOT EXISTS password_hash TEXT;
```

- [ ] **Step 2: 마이그레이션 실행**

```bash
npx supabase db push
```

### 참가자 생성 API

- [ ] **Step 3: POST /api/events/[id]/participants 리팩토링**

요청 body를 `{ name: string, password?: string }`으로 변경.

핵심 로직:
```
1. 이름 검증 (필수, 50자 제한)
2. 이름 중복 체크:
   - 동일 이름 존재 시:
     a. 비밀번호가 설정된 기존 참가자 → 비밀번호 확인 → 일치하면 기존 참가자 반환
     b. 비밀번호 미설정 기존 참가자 → 기존 참가자 반환 (누구나 접근 가능)
     c. 비밀번호 불일치 → 자동 넘버링 (최비성-2, 최비성-3...)
   - 새 이름 → 새 참가자 생성
3. 비밀번호 있으면 bcrypt 해시 저장
4. 응답: { id, name, existing, numbered }
   - existing: 기존 참가자 재접속
   - numbered: 넘버링이 적용된 경우 true + 실제 이름 반환
```

전체 코드:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const body = await request.json();
  const { name, password } = body;

  // Validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: '이름을 입력해주세요' }, { status: 400 });
  }
  const trimmedName = name.trim();
  if (trimmedName.length > 50) {
    return NextResponse.json({ error: '이름은 50자 이하로 입력해주세요' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Check event exists
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .single();

  if (!event) {
    return NextResponse.json({ error: '이벤트를 찾을 수 없습니다' }, { status: 404 });
  }

  // Check for existing participant with same name
  const { data: existing } = await supabase
    .from('participants')
    .select('id, name, password_hash')
    .eq('event_id', eventId)
    .eq('name', trimmedName)
    .single();

  if (existing) {
    // Name exists
    if (existing.password_hash) {
      // Has password — verify
      if (!password) {
        return NextResponse.json({
          error: '이 이름은 비밀번호가 설정되어 있습니다',
          requires_password: true,
        }, { status: 401 });
      }
      const valid = await bcrypt.compare(password, existing.password_hash);
      if (!valid) {
        // Wrong password → auto-number
        const { data: allWithPrefix } = await supabase
          .from('participants')
          .select('name')
          .eq('event_id', eventId)
          .like('name', `${trimmedName}-%`);

        let num = 2;
        const existingNums = (allWithPrefix ?? [])
          .map(p => { const m = p.name.match(/-(\d+)$/); return m ? parseInt(m[1]) : 0; })
          .filter(n => n > 0);
        while (existingNums.includes(num)) num++;

        const numberedName = `${trimmedName}-${num}`;
        const hash = password ? await bcrypt.hash(password, 10) : null;

        const { data: newP, error } = await supabase
          .from('participants')
          .insert({ event_id: eventId, name: numberedName, password_hash: hash })
          .select('id, name')
          .single();

        if (error) {
          return NextResponse.json({ error: '참여에 실패했습니다' }, { status: 500 });
        }
        return NextResponse.json({ id: newP.id, name: newP.name, existing: false, numbered: true });
      }
      // Password correct → return existing
      return NextResponse.json({ id: existing.id, name: existing.name, existing: true });
    } else {
      // No password — anyone can access
      return NextResponse.json({ id: existing.id, name: existing.name, existing: true });
    }
  }

  // New participant
  const hash = password ? await bcrypt.hash(password, 10) : null;

  // Optional: get authenticated user
  let userId: string | null = null;
  try {
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    userId = user?.id ?? null;
  } catch { /* optional */ }

  const insertData: Record<string, unknown> = {
    event_id: eventId,
    name: trimmedName,
    password_hash: hash,
  };
  if (userId) insertData.user_id = userId;

  const { data: newParticipant, error } = await supabase
    .from('participants')
    .insert(insertData)
    .select('id, name')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 같은 이름이 존재합니다' }, { status: 409 });
    }
    return NextResponse.json({ error: '참여에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({ id: newParticipant.id, name: newParticipant.name, existing: false }, { status: 201 });
}
```

### 참가자 수정 API

- [ ] **Step 4: PATCH /api/events/[id]/participants/[pid] 리팩토링**

토큰 대신 비밀번호로 인증. 비밀번호 미설정 참가자는 인증 없이 수정 가능.

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const { id: eventId, pid } = await params;
  const body = await request.json();
  const { availability, password } = body;

  const supabase = createServerClient();

  // Fetch participant
  const { data: participant } = await supabase
    .from('participants')
    .select('id, password_hash')
    .eq('id', pid)
    .eq('event_id', eventId)
    .single();

  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  // Auth check: only if participant has password
  if (participant.password_hash) {
    if (!password) {
      return NextResponse.json({ error: '비밀번호가 필요합니다' }, { status: 401 });
    }
    const valid = await bcrypt.compare(password, participant.password_hash);
    if (!valid) {
      return NextResponse.json({ error: '비밀번호가 일치하지 않습니다' }, { status: 401 });
    }
  }

  // Validate availability shape (기존 로직 유지)
  // ... (기존 검증 코드 유지)

  const { error } = await supabase
    .from('participants')
    .update({ availability })
    .eq('id', pid);

  if (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// sendBeacon용 POST fallback
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; pid: string }> }
) {
  return PATCH(request, context);
}
```

### 저장 훅

- [ ] **Step 5: useAvailabilitySave.ts — 토큰 대신 비밀번호 전달**

```typescript
interface UseAvailabilitySaveOptions {
  eventId: string;
  participantId: string | null;
  participantPassword: string | null; // token → password
}

// PATCH 요청 body에 password 포함
body: JSON.stringify({ availability, password: participantPassword }),
// X-Participant-Token 헤더 제거
```

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: 인증 구조 토큰→이름+비밀번호 전환"
```

---

## Task 2: 이름 입력 모달 UI 변경

**핵심 변경:** 이름 모달에 비밀번호 입력(선택) 추가. 이름 중복 시 넘버링 알림. localStorage에 `{ participantId, name, password }` 저장.

**Files:**
- Modify: `src/components/event-page/EventPageClient.tsx`

- [ ] **Step 1: 이름 모달에 비밀번호 필드 추가**

상태 추가:
```typescript
const [namePassword, setNamePassword] = useState('');
```

모달 form에 비밀번호 입력 추가 (이름 입력 아래):
```tsx
<div className="mt-3">
  <input
    type="password"
    value={namePassword}
    onChange={(e) => setNamePassword(e.target.value)}
    placeholder="비밀번호 (선택사항)"
    className="w-full px-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:border-emerald-600 focus:ring focus:ring-emerald-600/10 transition-all"
  />
  <p className="text-xs text-gray-400 mt-1">설정하면 다른 사람이 내 응답을 수정할 수 없습니다</p>
</div>
```

- [ ] **Step 2: handleNameSubmit 변경**

```typescript
// POST body에 password 포함
body: JSON.stringify({ name: nameInput.trim(), password: namePassword || undefined }),

// 응답 처리
const data = await res.json();

// 넘버링 알림
if (data.numbered) {
  // 이름이 변경됨을 알림 (예: "최비성" → "최비성-2")
  setNameInput(data.name); // 실제 저장된 이름으로 업데이트
}

// localStorage에 비밀번호도 저장 (편집 완료 시 PATCH에 필요)
localStorage.setItem(
  `whenmeets:${eventId}`,
  JSON.stringify({ participantId: data.id, name: data.name, password: namePassword || null }),
);

setParticipantId(data.id);
setParticipantPassword(namePassword || null); // token 대신 password
```

- [ ] **Step 3: readStoredSession 변경**

```typescript
function readStoredSession(eventId: string) {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(`whenmeets:${eventId}`);
    if (stored) return JSON.parse(stored) as { participantId: string; name: string; password: string | null };
  } catch {
    try { localStorage.removeItem(`whenmeets:${eventId}`); } catch {}
  }
  return null;
}
```

- [ ] **Step 4: state 변수 변경**

```typescript
// 기존:
const [participantToken, setParticipantToken] = useState<string | null>(session?.token ?? null);

// 변경:
const [participantPassword, setParticipantPassword] = useState<string | null>(session?.password ?? null);
```

useAvailabilitySave 호출도 변경:
```typescript
const { saving, saveNow } = useAvailabilitySave({
  eventId,
  participantId,
  participantPassword, // token → password
});
```

- [ ] **Step 5: requires_password 응답 처리**

POST 응답이 401 + `requires_password: true`이면 비밀번호 입력을 강조:
```typescript
if (res.status === 401) {
  const errData = await res.json();
  if (errData.requires_password) {
    setNameError('이 이름은 비밀번호가 설정되어 있습니다. 비밀번호를 입력해주세요.');
    // 비밀번호 필드에 포커스
    return;
  }
}
```

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: 이름 모달 비밀번호 추가 + 중복 넘버링"
```

---

## Task 3: 그리드 셀 높이 키우기 + 숫자 크기 + 편집 모드 숫자

**핵심 변경:** 셀 높이를 뷰포트 기반으로 키우기. 숫자를 더 크게. 편집 모드 GridCell에도 overlay 숫자를 결과 뷰와 동일 스타일로 표시.

**Files:**
- Modify: `src/components/availability-grid/AvailabilityGrid.tsx`
- Modify: `src/components/drag-grid/GridCell.tsx`
- Modify: `src/components/results/HeatmapGrid.tsx`

- [ ] **Step 1: 셀 높이 키우기**

`AvailabilityGrid.tsx`에서 셀 높이를 24px → `max(24px, 1.5vh)` 로직:

실제로는 Tailwind로 하기 어려우니 상수를 키움:
```typescript
// 기존: style={{ height: 24 }}
// 변경: style={{ height: 32 }}  — 약 2배로 (15 → 32)
```

시간 라벨도 동일하게 32px.

- [ ] **Step 2: 히트맵 숫자 크기 키우기**

`HeatmapGrid.tsx`에서:
```typescript
// 기존: text-[9px]
// 변경: text-xs (12px)
```

- [ ] **Step 3: 편집 모드 GridCell에 숫자 표시**

`GridCell.tsx`의 시간 셀 (wide가 아닌 일반 셀)에 overlay count를 히트맵과 동일 스타일로 표시:

```tsx
// 기존 overlay 표시 (줄 67-74):
{hasOverlay && (
  <>
    <div className="absolute inset-0 bg-emerald-400 pointer-events-none" style={{ opacity: overlayOpacity }} />
    <span className="absolute top-0 right-0.5 text-[7px] ...">{overlayCount}</span>
  </>
)}

// 변경: 중앙 정렬 + 흰색 + 더 큰 폰트
{hasOverlay && overlayCount > 0 && (
  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/90 pointer-events-none select-none">
    {overlayCount}
  </span>
)}
```

overlay 배경 opacity도 제거하고 숫자만 표시 (색 섞이면 구분 안 된다는 유저 피드백):

```tsx
// overlay 배경 div 제거 — 숫자만 표시
```

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat: 셀 높이 32px + 숫자 키우기 + 편집 모드 숫자 표시"
```

---

## Task 4: 편집 모드에서 응답자 목록 표시

**핵심 변경:** 편집 모드 사이드바에 응답자(ParticipantFilter) 목록 추가. 현재는 뷰 모드에서만 보임.

**Files:**
- Modify: `src/components/event-page/EventPageClient.tsx`

- [ ] **Step 1: 편집 모드 사이드바에 ParticipantFilter 추가**

현재 편집 모드 사이드바 구조:
```
- SegmentedControl (Available/If Needed)
- 하이라이트 배너
- 범례
- 캘린더 가져오기
- 내 응답 삭제
```

변경 후:
```
- SegmentedControl (Available/If Needed)
- 하이라이트 배너
- 범례
- 응답자 목록 (ParticipantFilter)  ← 추가
- 캘린더 가져오기
- 내 응답 삭제
```

편집 모드에서의 ParticipantFilter는 읽기 전용 (선택/해제 불가, 호버 하이라이트만):

```tsx
{/* 편집 모드 사이드바, 범례 아래에 추가 */}
{event.participants.length > 0 && (
  <div className="mb-5">
    <h3 className="text-sm font-semibold text-gray-900 mb-2">
      응답자 ({event.participants.length})
    </h3>
    <ParticipantFilter
      participants={event.participants}
      selectedIds={new Set(event.participants.map(p => p.id))}
      onSelectedChange={() => {}} // 읽기 전용
    />
  </div>
)}
```

- [ ] **Step 2: 커밋**

```bash
git add -A
git commit -m "feat: 편집 모드 사이드바에 응답자 목록 표시"
```

---

## Execution Order

| Task | 내용 | 의존성 |
|------|------|--------|
| 1 | 인증 구조 변경 (DB + API + hook) | 없음 |
| 2 | 이름 모달 UI 변경 | Task 1 (API 변경 필요) |
| 3 | 셀 높이 + 숫자 | 없음 (독립) |
| 4 | 편집 모드 응답자 목록 | 없음 (독립) |

Task 1→2 순서 의존. Task 3, 4는 독립적.
