/**
 * Kai — KaiwaAI's companion logo mark.
 * A simple violet half-circle (a head/hair silhouette, flat side down) with a
 * thin ahoge strand looping up from the top. No facial features. Inline SVG so
 * it scales crisply and recolors via theme tokens.
 */
export default function Kai({
  className = "",
  size = 160,
}: {
  className?: string;
  size?: number;
}) {
  const id = `kai-${size}`;
  // viewBox cropped tight to the actual artwork so there's no dead space
  // around the mark. Height derived from the crop's aspect ratio.
  const vb = { x: 36, y: 44, w: 132, h: 100 };
  return (
    <svg
      className={className}
      width={size}
      height={(size * vb.h) / vb.w}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      fill="none"
      role="img"
      aria-label="Kai, your Japanese learning companion"
    >
      <defs>
        <linearGradient id={`${id}-head`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b8a4ff" />
          <stop offset="100%" stopColor="var(--indigo, #7c5cff)" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d="M38 140a62 62 0 0 1 124 0Z" />
        </clipPath>
      </defs>

      {/* head — half circle, flat side down */}
      <path
        d="M38 140a62 62 0 0 1 124 0Z"
        fill={`url(#${id}-head)`}
      />

      {/* soft glossy sheen across the top of the head */}
      <g clipPath={`url(#${id}-clip)`}>
        <ellipse
          cx="100"
          cy="96"
          rx="46"
          ry="16"
          fill="#fff"
          opacity="0.22"
        />
      </g>

      {/* ahoge — a C-shaped tapering ribbon (opens to the left): leaves the head
          thick, arcs out to the right, and curls back so the fine tip points
          left, forming the letter C. */}
      <path
        d="M99 101
           C 118 96, 130 84, 127 68
           C 124 53, 110 47, 96 50
           C 107 53, 114 62, 112 73
           C 110 86, 102 94, 91 101
           Z"
        fill="var(--indigo, #7c5cff)"
      />

      {/* sakura hairpin — a 5-petal cherry blossom on the right side of the head */}
      <g transform="translate(146 104) scale(1.05)">
        {[0, 72, 144, 216, 288].map((angle) => (
          <path
            key={angle}
            transform={`rotate(${angle})`}
            d="M0 0C-6 -4 -6 -13 0 -19C6 -13 6 -4 0 0Z"
            fill="var(--sakura, #ff6b9d)"
          />
        ))}
        <circle r="3.2" fill="#ffd84d" />
      </g>
    </svg>
  );
}
