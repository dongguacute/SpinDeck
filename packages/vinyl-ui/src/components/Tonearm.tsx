/** 唱臂：底座固定，仅杆 + 唱头绕 pivot 旋转（SVG transform，避免 CSS 带动顶部） */
interface Props {
  className?: string;
  armDeg?: number;
  style?: React.CSSProperties;
}

const PIVOT_X = 26;
const PIVOT_Y = 13;

export default function Tonearm({ className, armDeg = -28, style }: Props) {
  return (
    <svg
      className={`sd-vinyl-arm ${className || ""}`}
      viewBox="0 0 40 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={style}
    >
      <defs>
        <linearGradient id="tonearm-metal" gradientUnits="userSpaceOnUse" x1="14" y1="0" x2="26" y2="0">
          <stop offset="0%" stopColor="var(--tonearm-arm-shadow, #b5b0a6)" />
          <stop offset="50%" stopColor="var(--tonearm-arm, #ece8df)" />
          <stop offset="100%" stopColor="var(--tonearm-arm-shadow, #b5b0a6)" />
        </linearGradient>
      </defs>
      {/* 底座固定（靠右，pivot 在光碟右缘外侧） */}
      <rect x="14" y="0" width="22" height="9" rx="1" fill="var(--tonearm-base, #121212)" />
      <rect x="17" y="7" width="16" height="6" rx="0.8" fill="var(--tonearm-base, #121212)" />
      {/* 杆 + 唱头：绕 pivot 一体旋转（底座在上方 sibling，不随动） */}
      <g
        className="sd-vinyl-arm-rotor"
        style={
          {
            transform: `rotate(${armDeg}deg)`,
            transformOrigin: `${PIVOT_X}px ${PIVOT_Y}px`,
            transformBox: "view-box",
          } as React.CSSProperties
        }
      >
        <line
          x1={PIVOT_X}
          y1={PIVOT_Y}
          x2="4"
          y2="117"
          stroke="url(#tonearm-metal)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <g transform="translate(4 117) rotate(98.2)">
          <ellipse className="sd-vinyl-arm-stylus-glow" cx="0" cy="17" rx="9" ry="3.5" />
          <rect x="-3.5" y="-2" width="13" height="5" rx="0.7" fill="var(--tonearm-headshell, #121212)" />
          <rect x="-3.5" y="2.5" width="7.5" height="14" rx="1" fill="var(--tonearm-headshell, #121212)" />
          <line
            x1="0"
            y1="16.5"
            x2="0"
            y2="20.5"
            stroke="var(--tonearm-headshell, #121212)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}
