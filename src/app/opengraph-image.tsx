import { ImageResponse } from 'next/og';
import Logo from '@/components/brand/Logo';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'DayMeet - 쉽고 빠른 그룹 일정 조율';

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
          background: 'linear-gradient(135deg, #26C6DA 0%, #00ACC1 45%, #006064 100%)',
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
            <Logo size={104} />
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
            DayMeet
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
