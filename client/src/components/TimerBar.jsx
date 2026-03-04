export default function TimerBar({ label, secondsLeft, total }) {
  const pct = Math.max(0, Math.min(100, (secondsLeft / total) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm"><span>{label}</span><span>{secondsLeft}s</span></div>
      <div className="h-3 rounded bg-zinc-700">
        <div className="h-3 rounded bg-white transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
