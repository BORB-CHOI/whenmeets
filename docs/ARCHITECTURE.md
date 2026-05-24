# DayMeet 아키텍처

DayMeet은 Next.js 16 App Router 위에서 동작하는 풀스택 서비스다. 백엔드는
다섯 개의 레이어로 분리되어 있고, 각 레이어는 단방향으로만 의존한다.
프론트엔드는 도메인별 컴포넌트와 React Query 캐시, 그리고 얇은
클라이언트 API 레이어로 구성된다.

## 레이어 다이어그램

```
┌────────────────────────────────────────────────────────────────┐
│  Presentation Layer (UI)                                       │
│  src/components/, src/hooks/                                    │
│  React 19 + Next.js App Router (RSC + 클라이언트 컴포넌트)        │
└─────────────────────────┬──────────────────────────────────────┘
                          │ typed fetch
┌─────────────────────────▼──────────────────────────────────────┐
│  Client API Layer                                              │
│  src/lib/api-client/                                            │
│  도메인별 함수 (eventsApi, participantsApi, foldersApi, ...)    │
│  ApiResponse<T> envelope 을 자동 unwrap, ApiClientError throw   │
└─────────────────────────┬──────────────────────────────────────┘
                          │ HTTP (REST)
┌─────────────────────────▼──────────────────────────────────────┐
│  Controller Layer (Next.js Route Handlers)                     │
│  src/app/api/**/route.ts                                        │
│  withApiHandler() 미들웨어로 감싼다.                              │
│  - zod 검증, service 호출, ok()/created()로 응답 직렬화             │
│  - 예외는 도메인 예외 클래스 → fail() 로 자동 매핑                  │
└─────────────────────────┬──────────────────────────────────────┘
                          │ DTO
┌─────────────────────────▼──────────────────────────────────────┐
│  Service Layer (도메인 로직)                                     │
│  src/server/services/                                           │
│  - events.service, participants.service, folders.service, ...   │
│  - 권한 체크, 도메인 규칙, 도메인 예외 throw                       │
│  - HTTP 비의존 (NextRequest/NextResponse 모름) → 테스트 쉬움      │
└─────────────────────────┬──────────────────────────────────────┘
                          │ entity / query
┌─────────────────────────▼──────────────────────────────────────┐
│  Repository Layer (데이터 액세스)                                │
│  src/server/repositories/                                       │
│  - events.repo, participants.repo, folders.repo, ...            │
│  - Supabase 쿼리만 (비즈니스 로직 0)                              │
└─────────────────────────┬──────────────────────────────────────┘
                          │ SQL
                  ┌───────▼───────┐
                  │   Supabase    │  Postgres + Row Level Security
                  └───────────────┘
```

의존 방향은 위에서 아래로만 흐른다. Repository 가 Service 를 import 할 수
없고, Service 가 Controller 를 import 할 수 없다.

## 디렉터리 구조

```
src/
├─ app/
│  └─ api/                         Controller (Next.js route handlers)
│     ├─ events/route.ts
│     ├─ events/[id]/route.ts
│     ├─ events/[id]/participants/route.ts
│     ├─ events/[id]/participants/[pid]/route.ts
│     ├─ events/[id]/results/route.ts
│     ├─ events/[id]/verify/route.ts
│     ├─ events/[id]/folder/route.ts
│     ├─ events/active/route.ts
│     ├─ events/reorder/route.ts
│     ├─ folders/route.ts
│     ├─ folders/[id]/route.ts
│     ├─ folders/reorder/route.ts
│     └─ user/profile/route.ts
│
├─ server/                          서버 전용 모듈 (Node-only)
│  ├─ http/                         HTTP 인프라
│  │  ├─ api-handler.ts             withApiHandler() 래퍼
│  │  ├─ response.ts                ok / created / fail 헬퍼
│  │  ├─ errors.ts                  ApiError + 도메인 예외 클래스
│  │  └─ auth-context.ts            getAuthContext()
│  ├─ services/                     Service Layer
│  │  ├─ events.service.ts
│  │  ├─ participants.service.ts
│  │  ├─ folders.service.ts
│  │  ├─ results.service.ts
│  │  ├─ user.service.ts
│  │  ├─ event-auth.service.ts
│  │  └─ auth.service.ts
│  ├─ repositories/                 Repository Layer
│  │  ├─ events.repo.ts
│  │  ├─ participants.repo.ts
│  │  ├─ folders.repo.ts
│  │  ├─ user-event-folders.repo.ts
│  │  ├─ user-event-order.repo.ts
│  │  └─ profiles.repo.ts
│  └─ validators/                   zod 스키마 (도메인별)
│     ├─ event.schema.ts
│     ├─ event-auth.schema.ts
│     ├─ participant.schema.ts
│     ├─ folder.schema.ts
│     └─ user.schema.ts
│
├─ lib/
│  ├─ api-client/                   Client API Layer
│  │  ├─ client.ts                  공통 fetch 래퍼 (envelope 자동 unwrap)
│  │  ├─ events.api.ts
│  │  ├─ participants.api.ts
│  │  ├─ folders.api.ts
│  │  └─ user.api.ts
│  ├─ availability/                 가용성/슬롯 도메인 모듈
│  ├─ date/                         날짜 도메인 모듈
│  └─ ui/                           UI 유틸 도메인 모듈
│
├─ types/
│  ├─ api.ts                        ApiResponse, ApiErrorCode 등
│  └─ event.ts                      도메인 DTO
│
├─ components/                      React 컴포넌트 (도메인별)
└─ hooks/                           React 훅
```

## HTTP 응답 envelope

모든 API 응답은 다음 형태를 따른다.

```ts
type ApiResponse<T> =
  | { success: true; data: T; meta?: { total; page; limit } }
  | { success: false; error: { code; message; details? } };
```

- 성공 시 `data` 안에 도메인 페이로드가 들어간다.
- 실패 시 `error.code` 가 머신 식별자, `error.message` 가 사람이 읽는
  한국어 메시지다. 클라이언트는 `code` 로 분기하고 `message` 는 그대로
  표시한다.

### 도메인 예외 → HTTP status 매핑

| 예외 클래스 | HTTP | code |
|---|---|---|
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ConflictError` | 409 | `CONFLICT` |
| `InternalError` (또는 기타) | 500 | `INTERNAL_ERROR` |

Service 는 도메인 예외만 던지고 HTTP status 를 모른다. `withApiHandler` 가
`fail()` 헬퍼로 한 곳에서 매핑한다.

## Controller 패턴

모든 route handler 는 다음 모양을 따른다.

```ts
export const POST = withApiHandler<Params, Body>(
  { paramsSchema, bodySchema },
  async ({ req, params, body }) => {
    const auth = await getAuthContext(req);
    const result = await someService.doThing(params.id, body, auth);
    return ok(result);
  },
);
```

- `withApiHandler` 가 zod 파싱·예외 매핑·envelope 직렬화를 담당한다.
- Route handler 안에 `if (!body.title) return NextResponse.json(...)` 류의
  인라인 검증을 두지 않는다.
- 권한 체크는 Service 에서 `authService.requireUser(auth)` /
  `authService.requireEventOwner(...)` 로 일관되게 처리한다.

## 인증 흐름

DayMeet 은 두 종류의 인증을 함께 사용한다.

1. **Supabase Auth (OAuth 로그인)** — 사용자 식별 (`auth.userId`).
   Service 에서 `authService.requireUser(auth)` 로 게이트.
2. **이벤트 비밀번호 토큰** — HMAC 으로 서명된 쿠키 (`daymeet_auth_<id>`).
   `getAuthContext().hasEventToken(eventId)` 로 검사.

이벤트는 두 가지 인증 형태가 섞일 수 있다: OAuth 로 만든 이벤트는
`created_by` 가 채워지고, 익명 이벤트는 비밀번호가 게이트로 동작한다.

## 데이터 모델

핵심 테이블 (Supabase / Postgres):

- `events` — 이벤트 본체 (`id`, `title`, `dates`, `time_start`, `time_end`,
  `mode`, `date_only`, `created_by`, `password_hash`, `deleted_at`)
- `participants` — 이벤트 참여자 (`event_id`, `name`, `availability`,
  `user_id`, `password_hash`)
- `profiles` — 사용자 프로필 (`id`, `display_name`, `avatar_url`,
  `no_folder_position`)
- `folders` — 사용자 폴더 (`user_id`, `name`, `position`)
- `user_event_folders` — 사용자별 이벤트 폴더 배정 매핑
- `user_event_order` — 사용자별 이벤트 카드 순서

RLS 가 모든 테이블에 적용되어 있고, 서버에서는 service-role 키로
우회한 뒤 application-level 권한 체크를 Service 레이어에서 강제한다.

## 테스트 전략

- **단위 테스트**: Service 와 Validator. Repository 는 mock.
- **통합 테스트**: 기존 `src/lib/__tests__/api-routes.integration.test.ts`
  가 라우트 응답 형태를 검증한다.
- **수동 회귀**: 캘린더/요일 모드 × 시간/날짜만 모드 × 편집/결과 모드 ×
  모바일/데스크탑 8 조합을 매 변경마다 시각 확인한다.

## 확장 포인트

- 새 도메인 추가 시: `validators/`, `repositories/`, `services/` 에
  도메인별 파일을 추가하고, `app/api/` 에 route handler 를 얇게 작성한다.
- 새 인증 정책 추가 시: `auth.service.ts` 에 `requireXxx` 헬퍼를 추가한다.
- 새 응답 코드 추가 시: `types/api.ts` 의 `ApiErrorCode` 와 `http/errors.ts`
  에 대응 클래스를 함께 추가한다.
