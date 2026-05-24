# DayMeet API 레퍼런스

모든 응답은 다음 envelope 을 따른다.

```ts
type ApiResponse<T> =
  | { success: true; data: T; meta?: { total; page; limit } }
  | { success: false; error: { code; message; details? } };
```

에러 코드 (`error.code`):

| code | HTTP | 의미 |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | 입력값이 검증 스키마와 맞지 않음 |
| `UNAUTHORIZED` | 401 | 로그인 또는 이벤트 비밀번호 인증이 필요 |
| `FORBIDDEN` | 403 | 인증은 됐지만 권한이 없음 |
| `NOT_FOUND` | 404 | 리소스를 찾지 못함 |
| `CONFLICT` | 409 | 중복·정원 초과 등 도메인 충돌 |
| `INTERNAL_ERROR` | 500 | 예기치 못한 서버 오류 |

## 이벤트

### `POST /api/events`

이벤트를 생성한다. 비로그인 사용자도 호출 가능 (`created_by` 가 비어
있는 익명 이벤트가 만들어진다).

Request body (`createEventSchema`):

```ts
{
  title: string,           // 1~200자
  dates: string[],         // YYYY-MM-DD 형식 1~60개 OR ['mon','tue',...] 요일
  time_start?: number,     // 슬롯 인덱스 0~96 (기본 36 = 09:00)
  time_end?: number,       // 슬롯 인덱스 (start < end)
  password?: string,       // 이벤트 비밀번호 (선택)
  mode?: 'available' | 'unavailable',
  date_only?: boolean,
  start_on_monday?: boolean,
}
```

Response: `201 Created` `{ id: string }`

### `GET /api/events/[id]`

이벤트 상세 + 참여자 목록.

- 비밀번호 이벤트이고 토큰 쿠키가 없으면 `{ id, title, has_password: true,
  requires_auth: true }` 만 돌려준다.
- OAuth 로그인한 본인이 만든 이벤트면 `is_owner: true`.

### `PATCH /api/events/[id]`

이벤트 메타데이터 수정. 본인 (`created_by === userId`) 만 가능.

Body (`updateEventSchema`): create 와 같은 필드를 모두 optional 로.

### `DELETE /api/events/[id]`

소프트 삭제 (`deleted_at` 채움). 로그인 필요 + 본인만 가능.

### `POST /api/events/active`

로컬에 저장된 이벤트 ID 목록 중 아직 살아있는(`deleted_at IS NULL`) 것만
필터링해서 돌려준다.

Body: `{ ids: string[] }` (최대 100개)
Response: `{ activeIds: string[] }`

### `PATCH /api/events/reorder`

대시보드 카드 cross-folder 이동 + 폴더 내 순서 일괄 업데이트.

Body: `{ updates: { event_id, folder_id|null, position }[] }`

## 참여자

### `POST /api/events/[id]/participants`

이벤트 참여(또는 본인 슬롯 재진입). 로그인 / 익명 + 비밀번호 두 경로 지원.

Body: `{ name: string, password?: string }`
Response: `{ id, name, existing, numbered? }`

### `PATCH /api/events/[id]/participants/[pid]`

가용성 저장. 본인(로그인) 또는 비밀번호 인증한 익명 슬롯만 수정 가능.

Body: `{ availability: { [date]: { [slot]: 0|1|2 } }, password?: string }`

### `DELETE /api/events/[id]/participants/[pid]`

참여자 삭제. 본인 / 이벤트 호스트 / 비밀번호 인증자 가능.

### `POST /api/events/[id]/participants/[pid]`

PATCH 와 동일. `navigator.sendBeacon` 호환용 alias.

## 비밀번호 인증

### `POST /api/events/[id]/verify`

이벤트 비밀번호 확인 후 HMAC 서명 쿠키 (`daymeet_auth_<id>`) 발급.

Body: `{ password: string }`

## 결과 집계

### `GET /api/events/[id]/results`

이벤트 + 참여자 가용성. 비밀번호 이벤트는 인증 쿠키가 필요하다.

## 폴더 (로그인 필요)

### `GET /api/folders`

내 폴더 목록 (position asc, created_at asc).

### `POST /api/folders`

폴더 생성. Body: `{ name: string }` (40자, 50개 한도).

### `PATCH /api/folders/[id]`

폴더 이름 변경. Body: `{ name }`.

### `DELETE /api/folders/[id]`

폴더 삭제. 폴더 안 이벤트들의 `user_event_folders` 매핑이 `ON DELETE`
규칙에 따라 정리된다.

### `PATCH /api/folders/reorder`

폴더 순서 + `__no_folder__` 가상 위치 일괄 저장.

Body: `{ order: { key: string, position: number }[] }`

### `PATCH /api/events/[id]/folder`

이벤트를 폴더에 배정 (또는 해제). `folder_id: null` 이면 해제.

## 사용자 (로그인 필요)

### `GET /api/user/profile`

내 프로필.

### `PATCH /api/user/profile`

표시 이름 변경 + 모든 참여자 슬롯 이름 동기화 (best-effort, 충돌 시
건너뜀).

Body: `{ display_name: string }`
Response: `{ profile, participants: { updated, skipped } | null }`
