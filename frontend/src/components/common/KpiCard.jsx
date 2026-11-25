import React from 'react';

const ICON_ACCENTS = {
  blue: 'bg-blue-50 text-blue-900 border-blue-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
};

export default function KpiCard({ title, value, subtitle, icon: Icon, accent = 'blue' }) {
  const iconStyle = ICON_ACCENTS[accent] || ICON_ACCENTS.blue;

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 truncate">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${iconStyle}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      {subtitle && (
        <p className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
}
