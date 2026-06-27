// Decorative drifting sakura petals. Purely atmospheric, behind content.
const PETALS = [
  { left: "8%", size: 10, dur: 14, delay: 0 },
  { left: "22%", size: 7, dur: 18, delay: 4 },
  { left: "39%", size: 12, dur: 12, delay: 2 },
  { left: "55%", size: 8, dur: 20, delay: 7 },
  { left: "70%", size: 9, dur: 15, delay: 1 },
  { left: "85%", size: 11, dur: 17, delay: 5 },
  { left: "94%", size: 6, dur: 13, delay: 3 },
];

export default function Petals() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="petal"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
