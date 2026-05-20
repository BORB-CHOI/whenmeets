interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className, size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#00ACC1" />
      <rect x="4" y="4" width="6" height="6" rx="1.6" fill="rgba(255,255,255,0.40)" />
      <rect x="13" y="4" width="6" height="6" rx="1.6" fill="rgba(255,255,255,0.55)" />
      <rect x="22" y="4" width="6" height="6" rx="1.6" fill="rgba(255,255,255,0.40)" />
      <rect x="4" y="13" width="6" height="6" rx="1.6" fill="rgba(255,255,255,0.55)" />
      <rect x="13" y="13" width="6" height="6" rx="1.6" fill="rgba(255,255,255,1)" />
      <rect x="22" y="13" width="6" height="6" rx="1.6" fill="rgba(255,255,255,0.75)" />
      <rect x="4" y="22" width="6" height="6" rx="1.6" fill="rgba(255,255,255,0.40)" />
      <rect x="13" y="22" width="6" height="6" rx="1.6" fill="rgba(255,255,255,0.75)" />
      <rect x="22" y="22" width="6" height="6" rx="1.6" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}
