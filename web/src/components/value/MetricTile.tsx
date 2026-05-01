import { TrendingUp } from "lucide-react";
interface Props {
  label: string;
  value: string;
  delta?: string;
  brassColor: string;
}
export function MetricTile({ label, value, delta, brassColor }: Props) {
  return (
    <div className="bg-black/40 border border-white/10 rounded-xl p-5">
      <p className="text-[10px] tracking-[0.2em] text-white/50 uppercase">{label}</p>
      <p className="text-3xl md:text-4xl font-bold text-white tabular-nums mt-1">{value}</p>
      {delta && (
        <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
          <TrendingUp size={12} />
          <span>{delta}</span>
          <span className="text-white/40 ml-1">since 9am</span>
        </p>
      )}
      {/* mini sparkline placeholder */}
      <svg viewBox="0 0 100 20" className="mt-2 w-full h-4">
        <polyline points="0,15 20,12 40,14 60,8 80,10 100,5" fill="none" stroke={brassColor} strokeWidth="1.5"/>
      </svg>
    </div>
  );
}
