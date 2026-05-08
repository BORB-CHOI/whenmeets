import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'WhenMeets - 쉽고 빠른 그룹 일정 조율';

const PRETENDARD_BOLD =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf';
const PRETENDARD_SEMIBOLD =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-SemiBold.otf';

export default async function OpengraphImage() {
  const [boldFont, semiBoldFont] = await Promise.all([
    fetch(PRETENDARD_BOLD).then((res) => res.arrayBuffer()),
    fetch(PRETENDARD_SEMIBOLD).then((res) => res.arrayBuffer()),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #00897B 0%, #00695C 60%, #004D40 100%)',
          fontFamily: 'Pretendard',
          padding: 80,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
          }}
        >
          <div
            style={{
              width: 140,
              height: 140,
              background: 'white',
              borderRadius: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 30px 60px -20px rgba(0,0,0,0.35)',
            }}
          >
            <svg width="92" height="92" viewBox="0 0 32 32">
              <path
                d="M7 10h3l3.5 9.5L17 12l3.5 7.5L24 10h3l-5.5 14h-2.5L16 17l-3 7H10.5L7 10z"
                fill="#00897B"
              />
            </svg>
          </div>
          <div
            style={{
              fontSize: 120,
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            WhenMeets
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 52,
            fontWeight: 700,
            color: 'white',
            marginTop: 56,
            letterSpacing: '-0.02em',
          }}
        >
          쉽고 빠른 그룹 일정 조율
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 32,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.85)',
            marginTop: 20,
            letterSpacing: '-0.01em',
          }}
        >
          링크 공유하고, 시간만 고르면 끝
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Pretendard', data: boldFont, weight: 800, style: 'normal' },
        { name: 'Pretendard', data: semiBoldFont, weight: 600, style: 'normal' },
      ],
    },
  );
}
