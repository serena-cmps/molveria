export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" style={{ width: size, height: size, flex: "none", overflow: "visible" }}>
      <g
        stroke="#3fe0ff"
        strokeWidth={2.2}
        fill="none"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 6px rgba(63,224,255,.85))" }}
      >
        <path d="M16 4.5 L25 9.8 L25 20.2 L16 25.5 L7 20.2 L7 9.8 Z" />
        <path d="M25 9.8 L31 6.4" />
      </g>
      <g fill="#04060b" stroke="#8fe9ff" strokeWidth={2} style={{ filter: "drop-shadow(0 0 5px rgba(63,224,255,.8))" }}>
        <circle cx={16} cy={4.5} r={2.6} />
        <circle cx={25} cy={20.2} r={2.6} />
        <circle cx={7} cy={20.2} r={2.6} />
      </g>
      <g fill="#8fe9ff" style={{ filter: "drop-shadow(0 0 6px #3fe0ff)" }}>
        <circle cx={31} cy={6.4} r={2.6} />
      </g>
    </svg>
  );
}
