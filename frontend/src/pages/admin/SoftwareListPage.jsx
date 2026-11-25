import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { Plus, Edit3, Trash2, ArrowUpRight, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SoftwareListPage() {
  const { refreshSoftware } = useAuth();
  const navigate = useNavigate();

  const [softwareList, setSoftwareList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);

  const loadSoftware = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/software?includeInactive=true');
      setSoftwareList(res.software || []);
    } catch (err) {
      setBanner({ type: 'error', text: err.message || 'Failed to load software list.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSoftware();
  }, [loadSoftware]);

  const handleDeleteSoftware = async (sw) => {
    if (!window.confirm(`Delete or deactivate "${sw.name}"?`)) return;
    setBanner(null);
    try {
      const res = await apiRequest(`/software/${sw._id}`, { method: 'DELETE' });
      setBanner({ type: 'success', text: res.message });
      await loadSoftware();
      await refreshSoftware();
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Software List</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage all configured software tools, view dashboards, or edit missing details.
          </p>
        </div>
        <button
          onClick={() => navigate('/add-software')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Software
        </button>
      </div>

      {banner && (
        <div
          className={`p-3.5 rounded-lg text-sm flex items-center gap-2.5 border ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading software list...</div>
        ) : softwareList.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Cpu}
              title="No Software Added Yet"
              description="Click 'Add Software' to add your first software tool, data types, and custom metric fields."
              actionLabel="Add Software"
              onAction={() => navigate('/add-software')}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Software Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Data Types</th>
                  <th className="py-3 px-4">Metrics</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {softwareList.map((sw, idx) => (
                  <tr key={sw._id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500 font-medium">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{sw.name}</div>
                      {sw.description && (
                        <div className="text-xs text-slate-500 line-clamp-1">{sw.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {sw.code}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(sw.dataTypes || []).map((dt) => (
                          <span
                            key={dt}
                            className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200"
                          >
                            {dt}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 text-xs">
                      {sw.metricFields?.length || 0} fields
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        label={sw.isActive ? 'Active' : 'Inactive'}
                        variant={sw.isActive ? 'active' : 'inactive'}
                      />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/software/${sw._id}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-blue-900 text-xs font-semibold"
                        >
                          Dashboard <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/edit-software/${sw._id}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSoftware(sw)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Delete software"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
