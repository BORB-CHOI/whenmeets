import type { Availability, AvailabilityLevel, EventData, EventMode } from '@/lib/types';

export type DemoSlug = 'wedding-reunion' | 'family-holiday' | 'team-meeting' | 'study-group';

export interface DemoFixture {
  id: string;
  title: string;
  description: string;
  dates: string[];
  timeStart: number;
  timeEnd: number;
  mode: EventMode;
  dateOnly: boolean;
  startOnMonday?: boolean;
  participants: Array<{
    id: string;
    name: string;
    availability: Availability;
  }>;
}

export interface UseCaseFixture extends DemoFixture {
  slug: DemoSlug;
  scenarioHeadline: string;
  scenarioBody: string[];
  keywords: string[];
  takeaways: string[];
}

function buildAvailability(
  dates: string[],
  timeStart: number,
  timeEnd: number,
  picker: (date: string, slot: number) => AvailabilityLevel,
): Availability {
  const result: Availability = {};
  for (const date of dates) {
    const row: Record<string, AvailabilityLevel> = {};
    for (let slot = timeStart; slot < timeEnd; slot++) {
      const value = picker(date, slot);
      if (value !== 0) {
        row[String(slot)] = value;
      }
    }
    if (Object.keys(row).length > 0) {
      result[date] = row;
    }
  }
  return result;
}

function buildAllDayAvailability(
  dates: string[],
  picker: (date: string) => AvailabilityLevel,
): Availability {
  const result: Availability = {};
  for (const date of dates) {
    const value = picker(date);
    if (value !== 0) {
      result[date] = { all_day: value };
    }
  }
  return result;
}

export function fixtureToEventData(fixture: DemoFixture): EventData {
  const now = new Date().toISOString();
  return {
    id: fixture.id,
    title: fixture.title,
    description: fixture.description,
    dates: fixture.dates,
    time_start: fixture.timeStart,
    time_end: fixture.timeEnd,
    has_password: false,
    created_at: now,
    mode: fixture.mode,
    date_only: fixture.dateOnly,
    start_on_monday: fixture.startOnMonday,
    participants: fixture.participants.map((p) => ({
      id: p.id,
      name: p.name,
      availability: p.availability,
      created_at: now,
      avatar_url: null,
    })),
  };
}

const DEMO_DATES = ['2026-07-04', '2026-07-05', '2026-07-11', '2026-07-12'];
const DEMO_TIME_START = 72;
const DEMO_TIME_END = 88;

export const DEMO_FIXTURE: DemoFixture = {
  id: 'demo',
  title: '7월 첫째·둘째 주말 저녁 약속',
  description: '다섯 명의 참여자가 시간을 표시한 예시입니다. 결과 히트맵에서 가장 진한 셀이 모두에게 가능한 시간입니다.',
  dates: DEMO_DATES,
  timeStart: DEMO_TIME_START,
  timeEnd: DEMO_TIME_END,
  mode: 'available',
  dateOnly: false,
  participants: [
    {
      id: 'demo-p1',
      name: '지원',
      availability: buildAvailability(DEMO_DATES, DEMO_TIME_START, DEMO_TIME_END, (date, slot) => {
        if (date === '2026-07-04') return slot >= 76 ? 2 : 0;
        if (date === '2026-07-05') return slot >= 74 && slot < 84 ? 2 : 0;
        if (date === '2026-07-11') return slot >= 76 ? 2 : 0;
        return slot >= 74 && slot < 84 ? 2 : 0;
      }),
    },
    {
      id: 'demo-p2',
      name: '민호',
      availability: buildAvailability(DEMO_DATES, DEMO_TIME_START, DEMO_TIME_END, (date, slot) => {
        if (date === '2026-07-04') return slot >= 76 && slot < 84 ? 2 : 0;
        if (date === '2026-07-05') return slot >= 72 && slot < 80 ? 1 : 0;
        if (date === '2026-07-11') return slot >= 76 && slot < 86 ? 2 : 0;
        return slot >= 76 && slot < 82 ? 2 : 0;
      }),
    },
    {
      id: 'demo-p3',
      name: '수아',
      availability: buildAvailability(DEMO_DATES, DEMO_TIME_START, DEMO_TIME_END, (date, slot) => {
        if (date === '2026-07-04') return slot >= 74 ? 2 : 0;
        if (date === '2026-07-05') return slot >= 80 ? 2 : 0;
        if (date === '2026-07-11') return slot >= 74 && slot < 84 ? 2 : 0;
        return slot >= 76 && slot < 82 ? 2 : 0;
      }),
    },
    {
      id: 'demo-p4',
      name: '준영',
      availability: buildAvailability(DEMO_DATES, DEMO_TIME_START, DEMO_TIME_END, (date, slot) => {
        if (date === '2026-07-04') return slot >= 78 && slot < 86 ? 2 : 0;
        if (date === '2026-07-05') return slot >= 74 && slot < 82 ? 2 : 0;
        if (date === '2026-07-11') return slot >= 76 && slot < 84 ? 2 : 0;
        return slot >= 76 && slot < 80 ? 1 : slot >= 80 && slot < 84 ? 2 : 0;
      }),
    },
    {
      id: 'demo-p5',
      name: '하늘',
      availability: buildAvailability(DEMO_DATES, DEMO_TIME_START, DEMO_TIME_END, (date, slot) => {
        if (date === '2026-07-04') return slot >= 76 && slot < 82 ? 2 : 0;
        if (date === '2026-07-05') return slot >= 76 && slot < 84 ? 2 : 0;
        if (date === '2026-07-11') return slot >= 78 && slot < 84 ? 2 : 0;
        return slot >= 76 && slot < 82 ? 2 : 0;
      }),
    },
  ],
};

const WEDDING_DATES = ['2026-08-15', '2026-08-16', '2026-08-22', '2026-08-23'];
const WEDDING_TIME_START = 44;
const WEDDING_TIME_END = 84;

const FAMILY_DATES = ['2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28'];

const TEAM_DATES = ['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03'];
const TEAM_TIME_START = 36;
const TEAM_TIME_END = 72;

const STUDY_DATES = ['2026-06-03', '2026-06-04', '2026-06-05', '2026-06-06', '2026-06-07', '2026-06-08'];
const STUDY_TIME_START = 72;
const STUDY_TIME_END = 88;

export const USE_CASE_FIXTURES: Record<DemoSlug, UseCaseFixture> = {
  'wedding-reunion': {
    slug: 'wedding-reunion',
    id: 'use-case-wedding',
    title: '결혼식 후 친구들 동창회',
    description: '결혼식에서 오랜만에 모인 친구들끼리 다시 만날 시간을 정해보세요.',
    scenarioHeadline: '결혼식·돌잔치 뒤에 이어지는 단발 모임에 가장 적합한 방식',
    scenarioBody: [
      '경조사 직후에는 단톡방에서 “언제 또 보자”가 늘 나오지만, 한 명이 “언제 시간 돼?” 물어보면 8명에게 7번 답이 돌아오면서 한 주가 그냥 흘러갑니다.',
      'WhenMeets는 이 “시간 물어보기” 단계를 1분 안에 끝내는 도구입니다. 호스트가 후보 주말 2~3개와 11시부터 21시까지의 시간대를 정해서 링크 하나만 카톡방에 던지면, 친구들은 각자 가능한 시간을 드래그로 표시합니다.',
      '결과 화면에서는 가장 진한 셀이 “모두에게 가능한 시간”이고, 한 명이 빠지면 두 번째 진한 셀로 차선책을 즉시 확인할 수 있습니다. 회원가입 없이 카톡 인앱 브라우저에서 바로 동작합니다.',
    ],
    keywords: ['결혼식 동창회', '단톡방 일정 조율', '오프라인 모임 시간 정하기'],
    takeaways: [
      '주말 점심·저녁 모두 포함한 11~21시 시간대 추천',
      '6~12인 단발성 모임에 최적 — 누가 “안 가능”인지 한눈에',
      '비밀번호 없이 익명 참여 가능 → 결혼식 하객도 부담 없음',
    ],
    dates: WEDDING_DATES,
    timeStart: WEDDING_TIME_START,
    timeEnd: WEDDING_TIME_END,
    mode: 'available',
    dateOnly: false,
    participants: [
      {
        id: 'wedding-p1',
        name: '신랑 친구 A',
        availability: buildAvailability(WEDDING_DATES, WEDDING_TIME_START, WEDDING_TIME_END, (date, slot) => {
          if (date === '2026-08-15') return slot >= 56 && slot < 80 ? 2 : 0;
          if (date === '2026-08-22') return slot >= 56 && slot < 80 ? 2 : 0;
          return 0;
        }),
      },
      {
        id: 'wedding-p2',
        name: '신부 친구 B',
        availability: buildAvailability(WEDDING_DATES, WEDDING_TIME_START, WEDDING_TIME_END, (date, slot) => {
          if (date === '2026-08-15') return slot >= 60 && slot < 76 ? 2 : 0;
          if (date === '2026-08-16') return slot >= 48 && slot < 64 ? 2 : 0;
          if (date === '2026-08-22') return slot >= 60 && slot < 80 ? 2 : 0;
          return 0;
        }),
      },
      {
        id: 'wedding-p3',
        name: '대학 동기 C',
        availability: buildAvailability(WEDDING_DATES, WEDDING_TIME_START, WEDDING_TIME_END, (date, slot) => {
          if (date === '2026-08-15') return slot >= 56 && slot < 72 ? 2 : 0;
          if (date === '2026-08-22') return slot >= 56 && slot < 76 ? 2 : 0;
          if (date === '2026-08-23') return slot >= 48 && slot < 60 ? 1 : 0;
          return 0;
        }),
      },
      {
        id: 'wedding-p4',
        name: '회사 동료 D',
        availability: buildAvailability(WEDDING_DATES, WEDDING_TIME_START, WEDDING_TIME_END, (date, slot) => {
          if (date === '2026-08-15') return slot >= 60 && slot < 76 ? 2 : 0;
          if (date === '2026-08-22') return slot >= 60 && slot < 80 ? 2 : 0;
          return 0;
        }),
      },
      {
        id: 'wedding-p5',
        name: '동네 친구 E',
        availability: buildAvailability(WEDDING_DATES, WEDDING_TIME_START, WEDDING_TIME_END, (date, slot) => {
          if (date === '2026-08-15') return slot >= 56 && slot < 76 ? 2 : 0;
          if (date === '2026-08-16') return slot >= 60 && slot < 76 ? 1 : 0;
          if (date === '2026-08-22') return slot >= 56 && slot < 80 ? 2 : 0;
          return 0;
        }),
      },
      {
        id: 'wedding-p6',
        name: '동아리 후배 F',
        availability: buildAvailability(WEDDING_DATES, WEDDING_TIME_START, WEDDING_TIME_END, (date, slot) => {
          if (date === '2026-08-15') return slot >= 60 && slot < 72 ? 2 : 0;
          if (date === '2026-08-22') return slot >= 60 && slot < 76 ? 2 : 0;
          return 0;
        }),
      },
    ],
  },
  'family-holiday': {
    slug: 'family-holiday',
    id: 'use-case-family',
    title: '추석 연휴 가족 모임',
    description: '명절 연휴에 흩어진 가족이 다 같이 모일 날짜를 정해보세요.',
    scenarioHeadline: '시간 단위가 의미 없을 때 — 날짜만 받는 “시간 없는 일정” 모드',
    scenarioBody: [
      '명절 모임은 보통 “이 날 가능하냐 / 안 가능하냐”만 중요합니다. 09시부터 21시까지 시간 슬롯을 잡아봐야 의미가 없죠.',
      'WhenMeets는 시간 단위 없이 날짜만 받는 “날짜 전용 모드”를 지원합니다. 추석 연휴 4일을 후보로 띄우면, 어머니부터 사촌까지 “가능 / 불가능”만 탭으로 표시합니다. 손가락 한 번에 한 날짜.',
      '결과 화면은 캘린더 그리드로 펼쳐지고, 가능 인원이 가장 많은 날에 색이 가장 진하게 들어옵니다. 시댁·처가 일정이 늦게 들어와도 새로 표시만 하면 자동으로 재계산됩니다.',
    ],
    keywords: ['추석 가족 모임', '명절 일정 조율', '날짜만 정하기'],
    takeaways: [
      '“시간 없는 일정” 모드로 09~21시 슬롯 없이 날짜만 표시',
      '캘린더 그리드로 한국 명절 연휴를 직관적으로 펼쳐 보기',
      '비밀번호 없이 가족 단톡방에서 즉시 응답 가능',
    ],
    dates: FAMILY_DATES,
    timeStart: 0,
    timeEnd: 1,
    mode: 'available',
    dateOnly: true,
    participants: [
      {
        id: 'family-p1',
        name: '어머니',
        availability: buildAllDayAvailability(FAMILY_DATES, (date) => (date === '2026-09-25' || date === '2026-09-26' ? 2 : date === '2026-09-27' ? 1 : 0)),
      },
      {
        id: 'family-p2',
        name: '아버지',
        availability: buildAllDayAvailability(FAMILY_DATES, (date) => (date === '2026-09-25' || date === '2026-09-26' ? 2 : 0)),
      },
      {
        id: 'family-p3',
        name: '동생 가족',
        availability: buildAllDayAvailability(FAMILY_DATES, (date) => (date === '2026-09-26' || date === '2026-09-27' ? 2 : 0)),
      },
      {
        id: 'family-p4',
        name: '큰누나',
        availability: buildAllDayAvailability(FAMILY_DATES, (date) => (date === '2026-09-26' ? 2 : date === '2026-09-27' || date === '2026-09-28' ? 1 : 0)),
      },
      {
        id: 'family-p5',
        name: '사촌형',
        availability: buildAllDayAvailability(FAMILY_DATES, (date) => (date === '2026-09-26' || date === '2026-09-27' ? 2 : 0)),
      },
    ],
  },
  'team-meeting': {
    slug: 'team-meeting',
    id: 'use-case-team',
    title: '팀 주간 회의 시간 조율',
    description: '재택·출근 섞인 5인 팀이 매주 만날 회의 시간을 정해보세요.',
    scenarioHeadline: '재택·출근 섞인 팀에서 “고정 회의 슬랏”을 찾는 가장 빠른 방법',
    scenarioBody: [
      '재택과 출근이 섞인 팀에서는 “언제 다 같이 회의할 수 있느냐”가 매주 골치 아픈 문제입니다. 캘린더 초대를 5번 보내봐야 “그 시간엔 다른 회의가 있다”는 답만 5번 돌아오죠.',
      'WhenMeets로 다음 한 주의 평일 5일과 09~18시 시간대를 잡고 링크를 슬랙 채널에 던지면, 팀원은 30초 안에 가능한 슬랏을 드래그합니다. 결과 화면에서 “전원 가능 + 1명 if needed”까지 한눈에 구분됩니다.',
      '매주 같은 이벤트를 재사용할 필요는 없습니다. 1~2분 만에 새 이벤트를 만들고 링크만 다시 공유하면 됩니다. 회사 계정 없이도 동작하고, 보안이 필요하면 비밀번호 옵션을 켜면 됩니다.',
    ],
    keywords: ['팀 회의 일정 조율', '재택 근무 회의 시간', '슬랙 일정'],
    takeaways: [
      '평일 09~18시 시간대에서 “전원 가능”과 “if needed” 분리 표시',
      '비밀번호 옵션으로 외부 공유 시 보안 강화',
      '매주 새 이벤트 — 캘린더 통합 없이 슬랙·노션과 잘 어울림',
    ],
    dates: TEAM_DATES,
    timeStart: TEAM_TIME_START,
    timeEnd: TEAM_TIME_END,
    mode: 'available',
    dateOnly: false,
    participants: [
      {
        id: 'team-p1',
        name: '팀장',
        availability: buildAvailability(TEAM_DATES, TEAM_TIME_START, TEAM_TIME_END, (date, slot) => {
          if (date === '2026-06-29') return slot >= 40 && slot < 48 ? 2 : 0;
          if (date === '2026-06-30') return slot >= 44 && slot < 60 ? 2 : 0;
          if (date === '2026-07-01') return slot >= 40 && slot < 56 ? 2 : 0;
          if (date === '2026-07-02') return slot >= 56 && slot < 68 ? 2 : 0;
          return slot >= 40 && slot < 56 ? 2 : 0;
        }),
      },
      {
        id: 'team-p2',
        name: '백엔드 개발자',
        availability: buildAvailability(TEAM_DATES, TEAM_TIME_START, TEAM_TIME_END, (date, slot) => {
          if (date === '2026-06-30') return slot >= 44 && slot < 60 ? 2 : 0;
          if (date === '2026-07-01') return slot >= 40 && slot < 60 ? 2 : 0;
          if (date === '2026-07-02') return slot >= 56 && slot < 68 ? 2 : 0;
          return 0;
        }),
      },
      {
        id: 'team-p3',
        name: '프론트엔드 개발자',
        availability: buildAvailability(TEAM_DATES, TEAM_TIME_START, TEAM_TIME_END, (date, slot) => {
          if (date === '2026-06-29') return slot >= 48 && slot < 60 ? 2 : 0;
          if (date === '2026-06-30') return slot >= 44 && slot < 60 ? 2 : 0;
          if (date === '2026-07-01') return slot >= 40 && slot < 60 ? 2 : 0;
          return slot >= 40 && slot < 52 ? 1 : 0;
        }),
      },
      {
        id: 'team-p4',
        name: '디자이너',
        availability: buildAvailability(TEAM_DATES, TEAM_TIME_START, TEAM_TIME_END, (date, slot) => {
          if (date === '2026-06-30') return slot >= 48 && slot < 60 ? 2 : 0;
          if (date === '2026-07-01') return slot >= 40 && slot < 60 ? 2 : 0;
          return 0;
        }),
      },
      {
        id: 'team-p5',
        name: 'PM',
        availability: buildAvailability(TEAM_DATES, TEAM_TIME_START, TEAM_TIME_END, (date, slot) => {
          if (date === '2026-06-29') return slot >= 44 && slot < 56 ? 1 : 0;
          if (date === '2026-06-30') return slot >= 44 && slot < 60 ? 2 : 0;
          if (date === '2026-07-01') return slot >= 40 && slot < 60 ? 2 : 0;
          return 0;
        }),
      },
    ],
  },
  'study-group': {
    slug: 'study-group',
    id: 'use-case-study',
    title: '대학 스터디 그룹 주간 일정',
    description: '8명의 스터디 그룹이 매주 만날 시간을 정해보세요.',
    scenarioHeadline: '8인 이상 스터디·동아리에서 “모두에게 맞는 시간”을 찾는 절차',
    scenarioBody: [
      '대학 스터디는 보통 8~15명 규모이고, 강의·알바·동아리 일정이 사람마다 다 다릅니다. 단톡방에서 “이 시간 어때?” 한 줄로 절대 안 정해집니다.',
      'WhenMeets로 다음 한 주의 평일 저녁과 주말을 후보 시간대로 잡고 링크를 카톡 단톡방에 공유하면, 스터디원은 회원가입 없이 바로 들어와 가능한 시간을 드래그합니다. 처음 들어온 사람이 비밀번호를 정하면 그 다음부터는 동일한 비밀번호로 자기 응답만 수정 가능합니다.',
      '결과 히트맵은 “가능 인원 비율”로 색을 입혀줍니다. 8명 중 7명 가능한 시간을 한눈에 찾고, 빠진 1명을 클릭하면 그 시간에 그 사람이 왜 불가능한지 즉시 확인할 수 있습니다.',
    ],
    keywords: ['스터디 일정 조율', '대학 동아리 시간 정하기', '단톡방 일정 정하기'],
    takeaways: [
      '주중 저녁(18~22시) 후보 시간대로 학교 스케줄과 충돌 최소화',
      '비밀번호 옵션으로 “남이 내 응답을 못 고치게” 보호',
      '8명 이상도 결과 히트맵에서 “가능 비율”로 곧장 비교',
    ],
    dates: STUDY_DATES,
    timeStart: STUDY_TIME_START,
    timeEnd: STUDY_TIME_END,
    mode: 'available',
    dateOnly: false,
    participants: [
      {
        id: 'study-p1',
        name: '서연',
        availability: buildAvailability(STUDY_DATES, STUDY_TIME_START, STUDY_TIME_END, (date, slot) => {
          if (date === '2026-06-03' || date === '2026-06-04') return slot >= 76 && slot < 86 ? 2 : 0;
          if (date === '2026-06-07' || date === '2026-06-08') return slot >= 76 && slot < 86 ? 2 : 0;
          return 0;
        }),
      },
      {
        id: 'study-p2',
        name: '도윤',
        availability: buildAvailability(STUDY_DATES, STUDY_TIME_START, STUDY_TIME_END, (date, slot) => {
          if (date === '2026-06-04') return slot >= 76 && slot < 84 ? 2 : 0;
          if (date === '2026-06-05') return slot >= 78 && slot < 86 ? 2 : 0;
          if (date === '2026-06-07' || date === '2026-06-08') return slot >= 74 && slot < 84 ? 2 : 0;
          return 0;
        }),
      },
      {
        id: 'study-p3',
        name: '하린',
        availability: buildAvailability(STUDY_DATES, STUDY_TIME_START, STUDY_TIME_END, (date, slot) => {
          if (date === '2026-06-03') return slot >= 76 && slot < 84 ? 2 : 0;
          if (date === '2026-06-04') return slot >= 76 && slot < 84 ? 2 : 0;
          if (date === '2026-06-07' || date === '2026-06-08') return slot >= 76 && slot < 86 ? 2 : 0;
          return 0;
        }),
      },
      {
        id: 'study-p4',
        name: '시우',
        availability: buildAvailability(STUDY_DATES, STUDY_TIME_START, STUDY_TIME_END, (date, slot) => {
          if (date === '2026-06-04') return slot >= 76 && slot < 84 ? 1 : 0;
          if (date === '2026-06-05') return slot >= 78 && slot < 84 ? 2 : 0;
          if (date === '2026-06-08') return slot >= 76 && slot < 84 ? 2 : 0;
          return 0;
        }),
      },
      {
        id: 'study-p5',
        name: '예린',
        availability: buildAvailability(STUDY_DATES, STUDY_TIME_START, STUDY_TIME_END, (date, slot) => {
          if (date === '2026-06-03' || date === '2026-06-04') return slot >= 76 && slot < 84 ? 2 : 0;
          if (date === '2026-06-07' || date === '2026-06-08') return slot >= 76 && slot < 86 ? 2 : 0;
          return 0;
        }),
      },
      {
        id: 'study-p6',
        name: '주원',
        availability: buildAvailability(STUDY_DATES, STUDY_TIME_START, STUDY_TIME_END, (date, slot) => {
          if (date === '2026-06-04') return slot >= 76 && slot < 84 ? 2 : 0;
          if (date === '2026-06-07' || date === '2026-06-08') return slot >= 76 && slot < 84 ? 2 : 0;
          return 0;
        }),
      },
      {
        id: 'study-p7',
        name: '지호',
        availability: buildAvailability(STUDY_DATES, STUDY_TIME_START, STUDY_TIME_END, (date, slot) => {
          if (date === '2026-06-04') return slot >= 76 && slot < 86 ? 2 : 0;
          if (date === '2026-06-08') return slot >= 76 && slot < 84 ? 2 : 0;
          return 0;
        }),
      },
      {
        id: 'study-p8',
        name: '나윤',
        availability: buildAvailability(STUDY_DATES, STUDY_TIME_START, STUDY_TIME_END, (date, slot) => {
          if (date === '2026-06-03') return slot >= 76 && slot < 82 ? 1 : 0;
          if (date === '2026-06-04') return slot >= 76 && slot < 84 ? 2 : 0;
          if (date === '2026-06-07' || date === '2026-06-08') return slot >= 76 && slot < 84 ? 2 : 0;
          return 0;
        }),
      },
    ],
  },
};

export const USE_CASE_SLUGS: DemoSlug[] = ['wedding-reunion', 'family-holiday', 'team-meeting', 'study-group'];

export function getUseCaseFixture(slug: string): UseCaseFixture | null {
  if ((USE_CASE_SLUGS as string[]).includes(slug)) {
    return USE_CASE_FIXTURES[slug as DemoSlug];
  }
  return null;
}
