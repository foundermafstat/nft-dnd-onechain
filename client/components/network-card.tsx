type NetworkCardProps = {
  label: string;
  value: string;
};

export function NetworkCard({ label, value }: NetworkCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/60">
        {label}
      </p>
      <p className="mt-3 break-all text-sm text-slate-100">{value}</p>
    </div>
  );
}
