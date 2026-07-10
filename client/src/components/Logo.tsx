type Props = { className?: string; size?: number };

export function Logo({ className, size = 28 }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      aria-label="Samosa Map logo"
      className={className}
      data-testid="img-logo"
    >
      {/* Triangular samosa silhouette pinned to a map */}
      <path
        d="M32 8 L56 50 L8 50 Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M32 22 L46 46 L18 46 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <circle cx="32" cy="38" r="2.4" fill="currentColor" />
    </svg>
  );
}
