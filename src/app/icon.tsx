import { ImageResponse } from 'next/og';
import Logo from '@/components/brand/Logo';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex' }}>
        <Logo size={32} />
      </div>
    ),
    { ...size },
  );
}
