import type { Face } from "@/lib/moods";

export type BuddyState = "idle" | "thinking" | "excited" | "roasting";

type BuddyProps = {
  face: Face;
  state?: BuddyState;
};

export default function Buddy({ face, state = "idle" }: BuddyProps) {
  const open = face.eyeRy;
  const blink = `${open};${open};1;1;${open};${open}`;

  return (
    <div
      className="buddy-float"
      style={{ animationDuration: `${face.floatSeconds}s` }}
      data-state={state}
    >
      <svg
        viewBox="0 0 200 200"
        className="h-48 w-48"
        role="img"
        aria-label="Your buddy"
      >
        {/* body */}
        <ellipse cx="100" cy="110" rx="70" ry="64" className="fill-accent" />

        {/* cheeks */}
        <circle cx="60" cy="125" r="9" fill="white" opacity="0.25" />
        <circle cx="140" cy="125" r="9" fill="white" opacity="0.25" />

        {/* eyes (the key restarts the blink when the mood changes) */}
        <g key={`${open}-${face.blinkSeconds}`}>
          {[78, 122].map((cx) => (
            <ellipse
              key={cx}
              cx={cx}
              cy="102"
              rx="8"
              ry={open}
              className="fill-ink"
            >
              <animate
                attributeName="ry"
                values={blink}
                keyTimes="0;0.8;0.85;0.9;0.95;1"
                dur={`${face.blinkSeconds}s`}
                repeatCount="indefinite"
              />
            </ellipse>
          ))}
        </g>

        {/* sleepy eyelids (only for moods with lids) */}
        {face.lids &&
          [78, 122].map((cx) => (
            <g key={cx}>
              <rect
                x={cx - 10}
                y="86"
                width="20"
                height="16"
                className="fill-accent"
              />
              <line
                x1={cx - 9}
                y1="102"
                x2={cx + 9}
                y2="102"
                className="stroke-ink"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
          ))}

        {/* mouth */}
        <path
          d={face.mouth}
          className={
            face.mouthFilled ? "fill-ink stroke-ink" : "fill-none stroke-ink"
          }
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}