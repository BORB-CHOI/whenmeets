# 계측 데이터 사전과 ChatGPT Ads 연결 계약

2026-11-11, 마이그레이션 `017_conversion_measurement.sql`과 현재 구현 기준이다. 다음 AI는 컬럼 이름만으로 용도를 추정하지 말고 이 문서를 먼저 읽는다. 활성화·성능·배포 상태·환경변수는 [운영 문서](conversion-measurement.md), 요청 형식은 [API 문서](API.md)가 각각 원본이다. 이 문서는 필드·이벤트의 의미와 광고 매체별 경계를 정의한다.

## 1. 공통 측정과 특정 광고 매체의 경계

| 부분 | 현재 범위 | 다음 AI가 지켜야 할 해석 |
|---|---|---|
| 제출 시각, 생성·최초 제출·재저장·그룹 활성화 | 데이밋 자체 제품 측정. 광고 매체와 무관 | ChatGPT Ads를 쓰지 않아도 제품 분석에 사용한다 |
| 브라우저 방문·유입·행동 기록 | 데이밋의 동의 기반 측정. GA4·Clarity 이벤트 표시에도 사용 | 실제 개인 식별·인증·수정 권한으로 사용하지 않는다 |
| `measurement_events` | 제품 기록과 ChatGPT Ads 전송 상태가 같은 행에 있는 혼합 구조 | 테이블 전체가 광고 전용이거나 완전히 매체 독립적이라고 설명하지 않는다 |
| `ads_sent_at`, `ads_attempts`, `ads_next_attempt_at` | **현재 ChatGPT Ads CAPI 한 곳의 서버 전송 상태** | 이름이 일반적이어도 다른 매체·브라우저 Pixel·GA4의 상태를 나타내지 않는다 |
| `context.oppref`, `context.obref`, `oaiq`, Pixel/CAPI 변환 | **OpenAI / ChatGPT Ads 전용** | Google Ads·Meta의 클릭 ID나 SDK로 재사용하지 않는다 |
| GA4 | 동의한 브라우저의 분석 이벤트 수신 | GA4 연결을 Google Ads 전환 연동 완료로 표현하지 않는다 |
| Clarity | 기존 화면 녹화·히트맵과 허용 후의 이벤트 표시 | 사용자 확정 요구대로 새 GA4·OpenAI 측정 스위치·선택과 독립 유지한다 |

현재는 **공통 제품 측정 + ChatGPT Ads 전용 광고 연결**이다. 다중 광고 매체에 각각 전송하고 상태를 분리하는 기능은 없다. `provider` 컬럼이나 매체별 전송 테이블도 없다.

## 2. DB 컬럼: 실제 의미·기록 주체·빈 값

### 기존 `participants`에 추가되는 컬럼

| 컬럼 | 타입·초깃값 | 누가 언제 기록하는가 | 정확한 의미·주의점 |
|---|---|---|---|
| `first_submitted_at` | `timestamptz`, NULL 허용·기본 NULL | `availability` UPDATE 트리거가 기존 값이 NULL일 때 `now()` 설정 | 계측 도입 후 이 응답 슬롯에서 관측한 최초 저장 시각. 기존 응답자의 실제 과거 최초 제출 시각은 아님 |
| `last_submitted_at` | `timestamptz`, NULL 허용·기본 NULL | 같은 트리거가 모든 `availability` UPDATE에 `now()` 설정 | 마지막 저장 시각. 실제 내용이 바뀌었는지와 별개이며 페이지 열람·로그인 시각이 아님 |

INSERT로 이름만 등록하면 두 컬럼은 NULL이다. 빈 `{}`도 UPDATE로 명시적 저장하면 제출이다. 가능/불가능 모드에 따라 빈 응답이 유효하므로 내용의 비어 있음으로 제출을 판정하지 않는다. 이름·프로필 등 다른 컬럼만 갱신하면 이 트리거는 실행되지 않는다.

DB가 관측하는 것은 저장 버튼 클릭 자체가 아니라 `UPDATE OF availability`다. 같은 값을 재저장하거나 관리자가 수동 UPDATE해도 실행된다. 과거 기록 보정 작업을 실제 사용자 전환으로 오인하지 않는다.

### 새 `measurement_visitors`

브라우저 방문 식별자와 새 전환 측정 선택의 현재 상태를 보관한다. 회원 테이블이나 동의 변경 이력 테이블이 아니다.

| 컬럼 | 타입·제약·기본값 | 기록 주체 | 정확한 의미 |
|---|---|---|---|
| `id` | `uuid` 기본키, DB 기본값 없음 | 계측 API가 기존 HttpOnly 방문 쿠키를 읽거나 UUID 생성 | 한 브라우저 저장 상태의 식별자. 회원 ID·실제 사람 ID·인증 토큰이 아님 |
| `consent` | `boolean NOT NULL`, 기본 false | 계측 API의 허용·거부 요청에서 upsert | 새 전환 측정에 대한 현재 허용 여부. Clarity 녹화 허용 여부가 아님 |
| `updated_at` | `timestamptz NOT NULL`, 기본 `now()` | 동의 상태를 upsert할 때 현재 시각 전달 | 마지막 동의 상태 저장 시각. 페이지 재진입 시 선택 복원도 갱신할 수 있어 최초 방문·마지막 활동·마지막 버튼 클릭 시각으로 사용하지 않음 |

### 새 `measurement_events`

한 행은 하나의 제품 결과 또는 허용한 브라우저 행동이다. 생성·최초 제출 등 DB 트리거 기록은 새 브라우저 측정 동의·광고 스위치와 별도로 남는다. 행동 로그와 광고 문맥 연결은 동의가 필요하다.

| 컬럼 | 타입·제약·기본값 | 기록·갱신 주체 | 정확한 의미와 NULL·빈 값의 의미 |
|---|---|---|---|
| `id` | `uuid` 기본키, `gen_random_uuid()` | DB insert | 기록 UUID. 전환은 Pixel `event_id`와 CAPI `id`에 같은 값을 사용. 매번 재시도할 때 새로 만들지 않음 |
| `name` | `text NOT NULL`, 기본값 없음 | DB 트리거 또는 행동 API | 데이밋 이벤트 이름. DB enum·CHECK 제약은 없으며 브라우저 허용 목록은 앱 스키마에서 검사 |
| `schedule_id` | `text`, NULL 허용 | 트리거는 일정 ID, 행동 API는 선택 입력 | 기존 `events.id`의 값. 제품의 일정과 계측 기록의 연결값. NULL은 특정 일정에 연결되지 않은 행동일 수 있음 |
| `participant_id` | `uuid`, NULL 허용 | 최초 제출·재저장 트리거 | 기존 `participants.id`의 값. 사람 수가 아니라 응답 슬롯을 가리킴. 생성·그룹 활성화·브라우저 행동에서는 비어 있을 수 있음 |
| `visitor_id` | `uuid`, NULL 허용 | 전환 연결 API, 행동 API, 활성화 트리거의 생성자 문맥 복사 | `measurement_visitors.id` 연결값. NULL은 문맥 미연결·동의 없음·철회 등 여러 원인이 가능하며, 로그인 여부를 뜻하지 않음 |
| `occurred_at` | `timestamptz NOT NULL`, 기본 `now()` | DB insert | 기록을 만든 트랜잭션의 시각. 광고 수신·재전송·실제 일정 개최 시각이 아님. CAPI 재시도에도 유지 |
| `context` | `jsonb NOT NULL`, 기본 `{}` | 전환 연결 API·행동 API; 활성화는 생성자 문맥 복사 | 동의·세션·유입·OpenAI 참조의 스냅샷. `{}`는 연결된 측정 문맥이 없다는 뜻이며 직접 유입으로 확정하지 않음 |
| `properties` | `jsonb NOT NULL`, 기본 `{}` | 트리거의 모드·날짜 전용 속성, 생성 API의 허용 속성, 행동 API | 행동 당시 속성. 누락은 미수집·해당 없음일 수 있으며 false와 같지 않음. 재저장 로그는 현재 기본 `{}` |
| `dedupe_key` | `text UNIQUE`, NULL 허용 | 전환 DB 트리거 | 생성 `created:{일정ID}`, 최초 제출 `submitted:{응답슬롯ID}`, 활성화 `activated:{일정ID}`. 재저장·행동은 기본 NULL이므로 반복 기록 가능 |
| `ads_sent_at` | `timestamptz`, NULL 허용 | ChatGPT Ads flush | CAPI HTTP 성공이고 validate-only가 아닐 때 설정. Pixel 수신·GA4 수신·실제 광고 귀속 성공 시각이 아님. NULL에는 광고 비대상·문맥 없음·미시도·실패·검증 모드가 모두 포함될 수 있음 |
| `ads_attempts` | `integer NOT NULL`, 기본 0 | flush가 전송 함수를 실행한 후 상태 갱신 | 현재 CAPI 전송 처리 시도 횟수. 검증 모드도 증가하며 실제 HTTP 수신 횟수와 같지 않음. 상태 갱신 실패나 인스턴스 경합 시 정확한 외부 요청 수를 보장하지 않음 |
| `ads_next_attempt_at` | `timestamptz NOT NULL`, 기본 `now()` | insert 및 flush의 상태 갱신 | 이 시각 이후 재시도 대상으로 조회 가능. 현재 재시도는 대략 1·2·4·8·16·32·60분 간격으로 증가. 이 시각에 자동 실행된다는 예약 보장은 없음 |

세 연결 ID에는 이번 SQL에서 외래키 제약을 만들지 않는다. 관련 일정·응답·방문 데이터가 삭제돼도 외래키 cascade로 이 기록이 자동 삭제되는 구조가 아니다. 이 보존 특성을 변경하려면 지표·동의 철회·삭제 정책을 함께 검토한다.

### 인덱스·권한·트리거의 목적

| SQL 객체·동작 | 목적·보장 범위 |
|---|---|
| `measurement_events_schedule_idx(schedule_id, name)` | 일정별 제품 결과 조회. 방문·광고 전송 전체를 위한 인덱스가 아님 |
| `measurement_events_pending_idx(ads_next_attempt_at, occurred_at)` | 미전송·방문 연결·동의 문맥이 있는 전환 3종만 포함. 일반 행동·재저장 로그를 광고 대기열로 취급하지 않음 |
| `measurement_events_visitor_idx(visitor_id, occurred_at)` | 방문별 연결·시계열 및 철회 시 연결 제거에 사용 |
| 두 계측 테이블의 RLS 및 anon/authenticated 권한 제거 | 일반 브라우저 DB 클라이언트에서 직접 접근 불가. 앱은 서버 `service_role`로 처리. Realtime에 공개하지 않음 |
| `measure_event_creation` / `measurement_event_created` | 일정 INSERT 뒤 생성 전환을 같은 트랜잭션에 삽입. 재시도에 같은 일정 ID를 사용하면 원래 기록을 재사용 |
| `measure_availability_submission` / `measurement_availability_submitted` | availability UPDATE 전에 최초·최근 시각, 최초 제출·재저장·활성화 기록 결정 |
| 최초 제출 분기의 부모 일정 `FOR UPDATE` | 같은 일정의 동시 최초 제출을 직렬화. 활성화 중복은 고유 키도 방어. 이미 제출한 슬롯의 재저장에서는 부모 잠금 없음 |
| 트리거 함수 `SECURITY DEFINER`, `search_path = public`, PUBLIC 실행 권한 제거 | DB 트리거 내부에서 기록 권한을 사용하며 일반 공개 함수 호출 경로로 제공하지 않음 |

## 3. 이벤트 정의와 수신처

`내부`는 measurement_events 기록, `GA4/표시`는 허용 후 브라우저 GA4와 Clarity 이벤트 표시를 뜻한다. Clarity 녹화 자체는 별도이며 계속 유지한다. `선택 CAPI/Pixel`은 ChatGPT Ads 허용 목록에 넣고 설정·동의 조건을 만족해야 전송한다는 뜻이다. 기본 허용 목록은 `event_created` 하나다.

| 이름 | 발행 기준·기록 주체 | 내부 / 외부 | 오해하면 안 되는 것 |
|---|---|---|---|
| `page_viewed` | Provider의 허용 후 경로 조회 | 내부·GA4 `page_view`·표시·OpenAI Pixel 표준 `page_viewed` | 첫 방문 고유 인원 수가 아님. Pixel 문서에는 실제 일정 경로를 전달하지 않음 |
| `event_form_opened` | 생성 폼·모달 열림. 허용 시 현재 열려 있는 폼도 기록 시도 | 내부·GA4/표시 | 입력 완료·생성 성공이 아님 |
| `event_created` | 일정 INSERT의 DB 트리거 | 내부·영수증 연결 시 GA4/표시·선택 CAPI/Pixel | 일정 확정·구매·예약 완료가 아님 |
| `event_viewed` | 비밀번호 조건 통과 후 일정 화면 표시. 허용 후 현재 화면도 기록 시도 | 내부·GA4/표시 | 생성자 본인 조회일 수 있어 초대받은 사람의 고유 열람으로 단정하지 않음 |
| `availability_edit_started` | 편집 시작 핸들러 | 내부·GA4/표시 | 제출 성공이나 각 셀 조작 횟수가 아님 |
| `event_link_copied` | clipboard Promise 성공 | 내부·GA4/표시 | 메시지 전송·실제 공유·상대방 열람이 아님 |
| `event_link_copy_failed` | clipboard 오류 | 내부·GA4/표시 | 사용자가 주소창 복사 등 다른 방법으로 공유했는지는 알 수 없음 |
| `availability_save_failed` | 저장 hook의 API·네트워크 오류 | 내부·GA4/표시 | DB 미저장 확정이 아님. 서버 저장 후 응답 유실도 포함 가능 |
| `availability_first_submitted` | 슬롯의 최초 availability UPDATE 트리거 | 내부·영수증 연결 시 GA4/표시·선택 CAPI/Pixel | 가입·이름 등록·실제 개인의 생애 첫 제출이 아님. 빈 값 명시적 저장도 포함 |
| `availability_updated` | 최초 제출 이후 availability UPDATE 트리거 | 내부만 | 실제 내용 변경 여부를 검사한 이벤트가 아님 |
| `group_activated` | 다른 제출 완료 슬롯이 있는 상태에서 최초 슬롯 제출. 일정당 한 번 | 내부·선택 CAPI만 | 실제 사람 2명·초대받은 사람 2명·일정 확정이 아님. 두 번째 응답자 Pixel·GA4에는 보내지 않음 |

`group_activated`의 방문 ID·광고 문맥은 두 번째 응답자가 아니라 **생성 전환에 연결돼 있던 생성자 문맥**이다. 문맥이 없다면 제품 활성화 기록만 남는다. 생성자의 권한이나 실명 인증을 이 문맥으로 대신하지 않는다.

## 4. JSON 필드 사전

아래는 [앱 스키마](../src/lib/measurement.ts)의 허용 목록이다. DB jsonb 자체가 이 구조를 강제하는 것은 아니다. 허용 필드가 있다는 사실과 모든 이벤트가 그 값을 수집한다는 사실을 구별한다.

### `context`

| 필드 | 현재 허용값·출처 | 의미·구분 |
|---|---|---|
| `consent` | 브라우저 문맥에서는 literal true | 새 전환 측정 허용 스냅샷. 전송 직전 DB의 현재 consent도 별도 확인 |
| `session_id` | 선택 UUID, 탭의 sessionStorage | 데이밋 브라우저 세션 식별. 회원 ID나 GA4 세션 ID와 동일하지 않음 |
| `source` | 선택 문자열, `utm_source` | 유입 소스. 영문·숫자·`_ . -` 1~100자만 허용 |
| `medium` | 선택 문자열, `utm_medium` | 유입 매체 분류. source와 같은 문자열 제한 |
| `campaign` | 선택 문자열, `utm_campaign` | 캠페인 이름. source와 같은 문자열 제한 |
| `referrer_host` | 선택 외부 호스트명, 1~253자 | 외부 유입 도메인. 원문 referrer URL·경로·쿼리는 저장하지 않음 |
| `oppref` | 선택 1~1024자·공백만인 값 제외, URL의 원본 값 | ChatGPT Ads가 제공하는 불투명 광고 귀속 참조. 일반 UTM이나 자체 생성 ID가 아님 |
| `obref` | 선택 1~128자·공백만인 값 제외, Pixel의 `__obref` 쿠키 | OpenAI Pixel 브라우저 참조. 데이밋 visitor_id와 다름 |

유효한 OpenAI 참조는 원문을 유지하고 임의 해석·해시·재생성하지 않는다. 값이 없으면 생략한다. CAPI 변환 직전에도 검증하여 기존 문맥의 잘못된 선택 참조가 전송 묶음을 방해하지 않도록 한다. 브라우저 유입 문맥은 30일 보관 로직을 사용하지만 별도 최초/최종 접점 모델이나 광고 귀속 기간을 정의하는 값은 아니다.

### `properties`

| 필드 | 허용값 | 정확한 의미 |
|---|---|---|
| `entry_point` | home, header, new_page, event_page, other | 동작 진입 위치. 광고 유입 소스와 다름 |
| `event_mode` | available, unavailable | 가능 시간 입력 또는 불가능 시간 입력 모드 |
| `date_only` | boolean | 시간 슬롯 없이 날짜만 선택하는 일정인지 |
| `date_selection_mode` | calendar, days_of_week | 특정 날짜 또는 반복 요일을 고르는 생성 방식 |
| `title_edited` | boolean | 사용자가 제목 입력을 수정했는지. 최종 제목이 자동 제목인지·내용이 무엇인지는 보장하지 않음 |
| `browser_context` | in_app, browser | 현재 브라우저 감지 결과. 특정 앱·사람의 확정 식별이 아님 |
| `failure_stage` | identity, save, network, clipboard | 오류 단계 분류. 현재 호출부는 save/network/clipboard를 발행하며 identity는 스키마 허용값일 뿐 현재 발행 지점이 없음 |
| `page_path` | 최대 120자 | 분석용 정제 경로. 쿼리·해시 제거, `/e/{실제접근키}`를 `/e/event`로 치환. 내부 schedule_id와 다름 |

이름·이메일·원문 제목·비밀번호·응답 시간표·실제 접근 키를 이 JSON에 추가하지 않는다. 속성 추가 시 스키마·현재 발행 지점·이 사전·외부 전달 범위를 함께 수정한다.

## 5. ChatGPT Ads에 실제로 맞춘 전송 계약

공식 규격 확인일은 2026-11-11이다. [OpenAI Pixel](https://developers.openai.com/ads/measurement-pixel)과 [Conversions API](https://developers.openai.com/ads/conversions-api)가 외부 규격의 원본이며, 아래 값은 현재 데이밋 어댑터의 선택이다. 일반 OpenAI 모델 API 키를 사용하지 않는다.

| 현재 구현 항목 | 실제 값·연결 | 의미 |
|---|---|---|
| 브라우저 SDK | `oaiq`, OpenAI의 `bzrcdn.openai.com/sdk/oaiq.min.js` | ChatGPT Ads 전용 Pixel. 동일 출처 `/measurement`의 최소 HTML에서만 실행 |
| 서버 endpoint | `https://bzr.openai.com/v1/events?pid={Pixel ID}` | ChatGPT Ads CAPI. 서버 전용 Bearer 키로 요청 |
| Pixel `event_id` / CAPI `id` | 같은 `measurement_events.id` | 동일 Pixel ID·이벤트 이름과 함께 중복 판별에 사용. 서로 다른 광고 매체의 중복을 제거하는 공통 키는 아님 |
| Pixel 이벤트 이름 / CAPI `type` | 제품 전환은 `custom` | 데이밋 제품 동작을 구매·예약 표준 이벤트로 잘못 매핑하지 않음 |
| `custom_event_name` | 내부 전환 이름 그대로 | Ads Manager에서도 Custom과 정확한 이름을 선택. 기본은 `event_created` |
| `data` | 제품 전환은 `{ "type": "custom" }` | 구매 금액·통화·가짜 매출을 붙이지 않음 |
| `timestamp_ms` | `occurred_at`를 epoch 밀리초로 변환 | CAPI에 원래 발생 시각 전달. 재전송 시 현재 시각으로 변경하지 않음 |
| `action_source` | `web` | 웹에서 발생한 전환으로 전송 |
| `source_url` | CAPI는 사이트 origin만, Pixel은 격리된 문서에서 자동 수집 | 실제 일정 접근 키를 외부 광고 URL로 전달하지 않도록 선택 |
| `oppref` | `context.oppref`를 최상위 필드로 전달 | OpenAI 광고 귀속 참조가 있을 때만 포함 |
| `user.obref` | `context.obref`를 user 안에 전달 | OpenAI Pixel 브라우저 참조가 있을 때만 포함. 회원 프로필을 붙이는 구조가 아님 |
| `opt_out` | 항상 true | 향후 사용자 단위 개인화 이용에 대한 opt-out. **측정 전송 거부를 뜻하지 않음**. 측정 허용·거부는 별도 consent로 처리 |
| `integration_source` | `daymeet` | 요청 묶음의 연동 식별자. 광고 매체 선택 필드가 아님 |
| `validate_only` | 서버 환경변수가 true일 때 true | CAPI 검증 요청이며 성공해도 ads_sent_at을 채우지 않음. Pixel 테스트 모드와 다름 |

데이밋 구현은 CAPI HTTP 성공을 확인하지만 Ads Manager의 귀속 결과를 DB로 동기화하지 않는다. `ads_sent_at`으로 광고 기여·광고비·실제 고객 수를 산출하지 않는다. 이메일 해시·IP·User-Agent를 CAPI의 user 객체에 추가하는 구현도 없다.

## 6. 동의·재전송·보존의 상태 의미

| 상태·동작 | 현재 결과 | 분석 시 주의 |
|---|---|---|
| DB 마이그레이션만 적용 | 생성·availability UPDATE의 내부 제품 기록 시작 | 새 광고 전송이 자동 활성화되는 것이 아님 |
| 새 계측 허용 전·거부 | 브라우저 행동·문맥 연결·새 GA4/OpenAI 전송 안 함 | 내부 제품 결과·Clarity 녹화의 분모와 다름 |
| 철회 | visitor의 consent=false, 해당 행들의 context={}·visitor_id=NULL, 브라우저 문맥·중복 억제 상태 제거 | 제품 로그 자체는 남고 과거 방문 연결은 사라져 브라우저 코호트 수치가 달라질 수 있음 |
| 원래 요청의 응답 유실 후 같은 방문자가 재시도 | 이미 연결한 전환 UUID 재사용 | 사용자에게 새 성공 동작이 생겼다고 중복 집계하지 않음 |
| 다른 방문자가 같은 전환을 연결하려 함 | 기존 방문 소유면 영수증 반환 안 함. 최초 연결은 NULL인 행만 원자적 갱신 | 다른 방문자의 광고 문맥으로 전환을 덮어쓰지 않음 |
| 오래된 미연결 전환 | 요청 시작보다 1초 넘게 앞선 기록은 새 문맥에 연결 안 함 | 과거 전환을 나중 방문자·새 광고에 소급 귀속하지 않음 |
| ads_sent_at=NULL | 전송 대상 조건을 따로 확인 | NULL 행 전체를 미전송 광고 전환으로 세지 않음 |
| 대기 전송 조회 | 허용 목록·현재/문맥 동의·방문 연결·미전송·재시도 시각·최근 6일을 만족한 최대 10건 | 6일은 현재 재전송 조회 범위. DB 보유 기간이나 광고 귀속 기간이 아님 |
| 낮은 트래픽·10건 초과·진행 중 새 기록 | 다음 요청 또는 인증된 스케줄러까지 대기 가능 | DB의 다음 시도 시각만으로 자동 실행을 가정하지 않음 |
| 보존·삭제 | 정기 삭제·분산 lease·매체별 상태 분리는 미구현 | 쿠키 유효 기간·유입 30일·재전송 6일을 DB 보유 정책으로 설명하지 않음 |

쿠키·저장소 키는 [constants.ts](../src/lib/constants.ts)가 원본이다. HttpOnly 방문·동의 쿠키의 요청 유효 기간은 180일이다. `daymeet:measurement:session`은 탭 세션, acquisition은 유입 문맥, sent는 최근 최대 200개 브라우저 전환 UUID 중복 억제다. consent는 새 측정 선택, denial은 늦은 허용 응답이 다른 탭의 거부를 덮지 않게 하는 철회 버전 표식이다. 이 저장소를 회원 인증·이벤트 접근 권한으로 사용하지 않는다.

## 7. 다음 AI의 변경 규칙과 소스 위치

| 변경하려는 부분 | 함께 확인할 소스 |
|---|---|
| 컬럼·인덱스·트리거·권한 | [017 SQL](../supabase/migrations/017_conversion_measurement.sql), [DB 검증](../supabase/tests/conversion_measurement.sql) |
| 이벤트 이름·JSON 허용 속성 | [constants.ts](../src/lib/constants.ts), [measurement.ts](../src/lib/measurement.ts), 실제 폼·페이지·저장 hook |
| 동의·문맥·영수증 연결·배치 재전송 | [계측 API](../src/app/api/measurement/route.ts), [브라우저 계측](../src/lib/measurement-client.ts), [서버 서비스](../src/server/measurement/service.ts) |
| ChatGPT Ads 필드·규격 | [CAPI 어댑터](../src/server/measurement/chatgpt-ads.ts), [Pixel 문서](../src/app/measurement/route.ts), 위 공식 문서 |

다른 광고 매체를 추가할 때 `ads_*`를 함께 쓰면 한 매체의 성공이 다른 매체의 대기를 지우므로 그대로 재사용하지 않는다. 필요한 매체별 상태·재시도·동의·전송 매핑을 설계하고 별도 마이그레이션으로 분리한다. 제품 이벤트 정의와 원래 전환 UUID는 유지한다. 이것은 확장 시 지켜야 할 조건이며 현재 다중 매체 기능이 구현됐다는 뜻이 아니다.

적용된 마이그레이션은 편집하지 않는다. 정의를 바꾸면 SQL·앱·이 사전·운영 문서·관련 검증을 함께 맞춘다. 문서나 이전 테스트 결과만으로 운영 DB 적용·배포·실제 광고 수신을 완료 처리하지 않는다. Clarity 독립 녹화 유지 조건은 계속 적용된다.
