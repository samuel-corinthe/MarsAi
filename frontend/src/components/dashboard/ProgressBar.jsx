export default function ProgressBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-xs text-slate-100/85">{label}</div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
      </div>
      <div className="text-xs font-semibold">{Math.round(value)}%</div>
    </div>
  );
}
