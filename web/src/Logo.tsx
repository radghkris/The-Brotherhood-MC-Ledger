// Simplified club mark: top rocker, emblem roundel, bottom rocker.
// The roundel is a stand-in; swap in the real horse-skull patch art when supplied.
export default function Logo({ height = 56 }: { height?: number }) {
  return (
    <svg className="logo" viewBox="0 0 220 150" height={height} role="img" aria-label="The Brotherhood MC, Paleto Bay">
      <defs>
        <path id="rock-top" d="M10 59 Q110 0 210 59" />
        <path id="rock-bot" d="M33 107 Q110 137 187 107" />
      </defs>
      <path d="M6 50 Q110 -10 214 50 L206 68 Q110 10 14 68 Z" fill="#0b0c0b" stroke="#2fd35a" strokeWidth="2" />
      <text fontSize="15" fontWeight="700" letterSpacing="2" fill="#efe8d6" textAnchor="middle" fontFamily="Georgia,serif">
        <textPath href="#rock-top" startOffset="50%" dy="5">THE BROTHERHOOD</textPath>
      </text>
      <circle cx="110" cy="76" r="30" fill="#0b0c0b" stroke="#2fd35a" strokeWidth="3" />
      <circle cx="110" cy="76" r="24" fill="none" stroke="#a39d8b" strokeWidth="1.5" strokeDasharray="4 2" />
      <path d="M110 58 V94 M92 76 H128 M97 63 L123 89 M123 63 L97 89" stroke="#2fd35a" strokeWidth="2.5" />
      <path d="M30 98 Q110 128 190 98 L184 116 Q110 146 36 116 Z" fill="#0b0c0b" stroke="#2fd35a" strokeWidth="2" />
      <text fontSize="13" fontWeight="700" letterSpacing="2" fill="#efe8d6" textAnchor="middle" fontFamily="Georgia,serif">
        <textPath href="#rock-bot" startOffset="50%" dy="5">PALETO BAY</textPath>
      </text>
    </svg>
  );
}
