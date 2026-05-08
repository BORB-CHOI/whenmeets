import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#00897B',
          borderRadius: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32">
          <path
            d="M7 10h3l3.5 9.5L17 12l3.5 7.5L24 10h3l-5.5 14h-2.5L16 17l-3 7H10.5L7 10z"
            fill="white"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
