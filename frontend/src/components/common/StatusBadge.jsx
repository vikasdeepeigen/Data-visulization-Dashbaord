import React from 'react';

const STYLES = {
  Admin: 'bg-blue-900 text-white border-blue-900',
  User: 'bg-slate-100 text-slate-800 border-slate-300',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-rose-50 text-rose-700 border-rose-200',
  DATA_ENTRY: 'bg-blue-50 text-blue-800 border-blue-200',
  SOFTWARE: 'bg-slate-100 text-slate-800 border-slate-300',
  EXCEL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  USER: 'bg-amber-50 text-amber-800 border-amber-200',
  AUTH: 'bg-slate-100 text-slate-600 border-slate-200',
  SYSTEM: 'bg-blue-50 text-blue-900 border-blue-200',
};

export default function StatusBadge({ label, variant }) {
  const style = STYLES[variant || label] || 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${style}`}>
      {label}
    </span>
  );
}
