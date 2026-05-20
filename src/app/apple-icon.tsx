import { ImageResponse } from 'next/og';
import Logo from '@/components/brand/Logo';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex' }}>
        <Logo size={180} />
      </div>
    ),
    { ...size },
  );
}
