import React from 'react';

export default function ProgressBar({ percentage = 0, showLabel = true, height = 'h-2' }) {
  const clamped = Math.max(0, Math.min(100, Number(percentage) || 0));

  let barColor = 'bg-blue-900';
  if (clamped >= 80) barColor = 'bg-emerald-600';
  else if (clamped >= 40) barColor = 'bg-blue-800';
  else if (clamped > 0) barColor = 'bg-amber-500';
  else barColor = 'bg-slate-300';

  return (
    <div className="flex items-center gap-2.5 w-full">
      <div className={`flex-1 bg-slate-200 rounded-full overflow-hidden ${height}`}>
        <div
          className={`${barColor} ${height} rounded-full transition-all duration-300`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold text-slate-700 tabular-nums w-12 text-right">
          {clamped.toFixed(1)}%
        </span>
      )}
    </div>
  );
}
