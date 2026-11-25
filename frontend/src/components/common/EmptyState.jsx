import React from 'react';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center flex flex-col items-center justify-center">
      {Icon && (
        <div className="w-11 h-11 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-md">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
