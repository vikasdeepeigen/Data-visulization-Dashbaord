import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/common/EmptyState';
import {
  PlusSquare,
  Cpu,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';

export default function DataEntryPage() {
  const { user, accessibleSoftware } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [selectedSoftwareId, setSelectedSoftwareId] = useState('');
  const [selectedSoftware, setSelectedSoftware] = useState(null);

  const [dataType, setDataType] = useState('');
  const [datasetName, setDatasetName] = useState('');
  const [location, setLocation] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalData, setTotalData] = useState('');
  const [completed, setCompleted] = useState('');
  const [processing, setProcessing] = useState('');
  const [pending, setPending] = useState('');
  const [notes, setNotes] = useState('');
  const [metrics, setMetrics] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [recentRecords, setRecentRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    if (accessibleSoftware.length === 0) return;
    const paramId = searchParams.get('softwareId');
    const matched = accessibleSoftware.find((s) => s._id === paramId);
    if (matched) {
      setSelectedSoftwareId(matched._id);
    } else if (!selectedSoftwareId || !accessibleSoftware.some((s) => s._id === selectedSoftwareId)) {
      setSelectedSoftwareId(accessibleSoftware[0]._id);
    }
  }, [accessibleSoftware, searchParams, selectedSoftwareId]);

  useEffect(() => {
    const sw = accessibleSoftware.find((s) => s._id === selectedSoftwareId) || null;
    setSelectedSoftware(sw);
    if (sw) {
      setDataType(sw.dataTypes?.[0] || '');
      const initialMetrics = {};
      (sw.metricFields || []).forEach((field) => {
        initialMetrics[field.key] = field.type === 'boolean' ? false : '';
      });
      setMetrics(initialMetrics);
    }
    setErrorMsg('');
    setSuccessMsg('');
  }, [selectedSoftwareId, accessibleSoftware]);

  const fetchRecentRecords = useCallback(async () => {
    if (!selectedSoftwareId) return;
    setLoadingRecords(true);
    try {
      const res = await apiRequest(`/records?softwareId=${selectedSoftwareId}&limit=10`);
      setRecentRecords(res.records || []);
    } catch {
      setRecentRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }, [selectedSoftwareId]);

  useEffect(() => {
    fetchRecentRecords();
  }, [fetchRecentRecords]);

  const handleAutoFillPending = () => {
    const t = Number(totalData) || 0;
    const c = Number(completed) || 0;
    const p = Number(processing) || 0;
    setPending(String(Math.max(0, t - c - p)));
  };

  const handleMetricChange = (key, value) => {
    setMetrics((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedSoftware) {
      setErrorMsg('Please select a software.');
      return;
    }

    if (!location.trim()) {
      setErrorMsg('Please enter a location.');
      return;
    }

    const t = Number(totalData);
    const c = Number(completed);
    const pr = Number(processing);
    const pe = Number(pending);

    if ([t, c, pr, pe].some((n) => Number.isNaN(n) || n < 0)) {
      setErrorMsg('Counts must be valid non-negative numbers.');
      return;
    }

    if (c + pr + pe > t) {
      setErrorMsg(`Completed (${c}) + Processing (${pr}) + Pending (${pe}) cannot exceed Total Data (${t}).`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest('/records', {
        method: 'POST',
        body: JSON.stringify({
          softwareId: selectedSoftware._id,
          dataType,
          datasetName: datasetName.trim(),
          location: location.trim(),
          totalData: t,
          completed: c,
          processing: pr,
          pending: pe,
          entryDate,
          notes: notes.trim(),
          metrics,
        }),
      });

      setSuccessMsg(res.message || `Saved entry for ${selectedSoftware.name}.`);
      setDatasetName('');
      setLocation('');
      setTotalData('');
      setCompleted('');
      setProcessing('');
      setPending('');
      setNotes('');
      const resetMetrics = {};
      (selectedSoftware.metricFields || []).forEach((f) => {
        resetMetrics[f.key] = f.type === 'boolean' ? false : '';
      });
      setMetrics(resetMetrics);
      fetchRecentRecords();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await apiRequest(`/records/${recordId}`, { method: 'DELETE' });
      fetchRecentRecords();
    } catch (err) {
      alert(err.message);
    }
  };

  if (accessibleSoftware.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Data Entry</h1>
        <EmptyState
          icon={Cpu}
          title={user?.role === 'Admin' ? 'No Software Added Yet' : 'No Software Assigned'}
          description={
            user?.role === 'Admin'
              ? 'Add a software tool on the Add Software page first to enter data.'
              : 'Ask an Administrator to assign software tools to your account.'
          }
          actionLabel={user?.role === 'Admin' ? 'Add Software' : undefined}
          onAction={user?.role === 'Admin' ? () => navigate('/add-software') : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Entry</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Select a software tool to open its data entry form.
          </p>
        </div>
        {selectedSoftware && (
          <button
            onClick={() => navigate(`/software/${selectedSoftware._id}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-blue-900 text-xs font-semibold self-start"
          >
            <span>Open {selectedSoftware.name} Page</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Software Selection */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
          Select Software Tool
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {accessibleSoftware.map((sw) => {
            const active = sw._id === selectedSoftwareId;
            return (
              <button
                key={sw._id}
                type="button"
                onClick={() => setSelectedSoftwareId(sw._id)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  active
                    ? 'bg-blue-900 border-blue-900 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-bold truncate">{sw.name}</div>
                <div
                  className={`text-[11px] font-mono mt-0.5 ${
                    active ? 'text-blue-200' : 'text-slate-500'
                  }`}
                >
                  {sw.code}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Card */}
      {selectedSoftware && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="pb-4 mb-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-blue-900 uppercase">
                Selected Software
              </span>
              <h2 className="text-xl font-bold text-slate-900">{selectedSoftware.name}</h2>
            </div>
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {selectedSoftware.code}
            </span>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Data Type <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-800"
                >
                  {(selectedSoftware.dataTypes || []).map((dt) => (
                    <option key={dt} value={dt}>
                      {dt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Dataset Name / ID <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="e.g. DS_2026_001"
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Location (Manual Entry) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter location manually..."
                  autoComplete="off"
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Date <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-800"
                />
              </div>
            </div>

            {/* Volume Breakdown */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase">Data Counts</span>
                <button
                  type="button"
                  onClick={handleAutoFillPending}
                  className="text-xs font-semibold text-blue-900 hover:underline"
                >
                  Auto-fill Pending
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Data *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={totalData}
                    onChange={(e) => setTotalData(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-700 mb-1">
                    Completed *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={completed}
                    onChange={(e) => setCompleted(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-900 mb-1">
                    Processing *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={processing}
                    onChange={(e) => setProcessing(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-700 mb-1">
                    Pending *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={pending}
                    onChange={(e) => setPending(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Software-Specific Metric Fields */}
            {(selectedSoftware.metricFields || []).length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 uppercase">
                  {selectedSoftware.name} — Specific Metrics
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...(selectedSoftware.metricFields || [])]
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((field) => (
                      <div key={field.key}>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {field.label} {field.unit ? `(${field.unit})` : ''}
                          {field.required && <span className="text-rose-600"> *</span>}
                        </label>
                        {field.type === 'select' ? (
                          <select
                            required={field.required}
                            value={metrics[field.key] ?? ''}
                            onChange={(e) => handleMetricChange(field.key, e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                          >
                            <option value="">Select...</option>
                            {(field.options || []).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : field.type === 'boolean' ? (
                          <label className="flex items-center gap-2 py-2 text-xs text-slate-800">
                            <input
                              type="checkbox"
                              checked={Boolean(metrics[field.key])}
                              onChange={(e) => handleMetricChange(field.key, e.target.checked)}
                              className="accent-blue-900"
                            />
                            <span>Yes / Verified</span>
                          </label>
                        ) : (
                          <input
                            type={
                              field.type === 'number' || field.type === 'percentage'
                                ? 'number'
                                : 'text'
                            }
                            step="any"
                            required={field.required}
                            value={metrics[field.key] ?? ''}
                            onChange={(e) => handleMetricChange(field.key, e.target.value)}
                            placeholder={field.placeholder || ''}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                          />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Notes (Optional)
              </label>
              <textarea
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold disabled:opacity-50"
              >
                <PlusSquare className="w-4 h-4" />
                <span>{submitting ? 'Saving...' : `Save Record for ${selectedSoftware.name}`}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Recent Records */}
      {selectedSoftware && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Recent Entries — {selectedSoftware.name}
            </h3>
            <button
              onClick={() => navigate(`/software/${selectedSoftware._id}`)}
              className="text-xs font-semibold text-blue-900 hover:underline"
            >
              View All &rarr;
            </button>
          </div>
          {loadingRecords ? (
            <div className="p-4 text-xs text-slate-500">Loading...</div>
          ) : recentRecords.length === 0 ? (
            <div className="p-4 text-xs text-slate-500">No entries saved yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-600">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Dataset</th>
                    <th className="py-2.5 px-4">Data Type</th>
                    <th className="py-2.5 px-4">Location</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                    <th className="py-2.5 px-4 text-right">Completed</th>
                    <th className="py-2.5 px-4 text-right">Processing</th>
                    <th className="py-2.5 px-4 text-right">Pending</th>
                    <th className="py-2.5 px-4 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {recentRecords.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-600">
                        {new Date(r.entryDate).toISOString().slice(0, 10)}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{r.datasetName}</td>
                      <td className="py-2.5 px-4 text-blue-900">{r.dataType}</td>
                      <td className="py-2.5 px-4 text-slate-700">{r.location}</td>
                      <td className="py-2.5 px-4 text-right font-semibold">{r.totalData}</td>
                      <td className="py-2.5 px-4 text-right text-emerald-700">{r.completed}</td>
                      <td className="py-2.5 px-4 text-right text-blue-900">{r.processing}</td>
                      <td className="py-2.5 px-4 text-right text-amber-700">{r.pending}</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteRecord(r._id)}
                          className="p-1 text-slate-400 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
