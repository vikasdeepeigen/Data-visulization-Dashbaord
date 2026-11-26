import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest, triggerFileDownload } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import KpiCard from '../../components/common/KpiCard';
import ProgressBar from '../../components/common/ProgressBar';
import {
  Download,
  Database,
  CheckCircle2,
  Clock,
  Hourglass,
  TrendingUp,
  Edit3,
  Trash2,
  X,
  Save,
} from 'lucide-react';

export default function ReportsActivityPage() {
  const { user, accessibleSoftware } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [softwareId, setSoftwareId] = useState('all');

  const [reportData, setReportData] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);

  const [editingRecord, setEditingRecord] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');




  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const params = new URLSearchParams();
      if (softwareId !== 'all') params.set('softwareId', softwareId);
      const res = await apiRequest(`/reports?${params.toString()}`);
      setReportData(res);
    } catch {
      setReportData(null);
    } finally {
      setLoadingReports(false);
    }
  }, [softwareId]);



  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExport = async (format) => {
    try {
      const params = new URLSearchParams();
      if (softwareId !== 'all') params.set('softwareId', softwareId);
      await triggerFileDownload(
        `/reports/export/${format}?${params.toString()}`,
        `av_platform_report.${format}`
      );
    } catch (err) {
      alert(err.message);
    }
  };


  
  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('Delete this report record permanently?')) return;
    try {
      await apiRequest(`/records/${recordId}`, { method: 'DELETE' });
      fetchReports();
    } catch (err) {
      alert(err.message || 'Failed to delete record.');
    }
  };

  const handleSaveEditRecord = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;
    setEditError('');
    setEditSaving(true);
    try {
      await apiRequest(`/records/${editingRecord._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          dataType: editingRecord.dataType,
          datasetName: editingRecord.datasetName,
          location: editingRecord.location,
          totalData: Number(editingRecord.totalData),
          completed: Number(editingRecord.completed),
          processing: Number(editingRecord.processing),
          pending: Number(editingRecord.pending),
          entryDate: editingRecord.entryDate?.slice(0, 10),
          notes: editingRecord.notes,
          metrics: editingRecord.metrics,
        }),
      });
      setEditingRecord(null);
      fetchReports();
    } catch (err) {
      setEditError(err.message || 'Failed to update record.');
    } finally {
      setEditSaving(false);
    }
  };

  const editingSoftware = editingRecord
    ? accessibleSoftware.find((sw) => sw._id === editingRecord.software) || null
    : null;

  const summary = reportData?.summary || {
    totalRecords: 0,
    totalData: 0,
    completed: 0,
    processing: 0,
    pending: 0,
    completionPercentage: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Select a software to view, edit, delete, or export its data reports.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold"
          >
            <Download className="w-4 h-4" /> Export JSON
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* Single Select Software Option */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70">
          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Software
            </label>
            <select
              value={softwareId}
              onChange={(e) => setSoftwareId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-800"
            >
              <option value="all">All Software</option>
              {accessibleSoftware.map((sw) => (
                <option key={sw._id} value={sw._id}>
                  {sw.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-5 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <KpiCard title="Total Data" value={summary.totalData} icon={Database} accent="slate" />
            <KpiCard
              title="Completed"
              value={summary.completed}
              icon={CheckCircle2}
              accent="emerald"
            />
            <KpiCard title="Processing" value={summary.processing} icon={Clock} accent="blue" />
            <KpiCard title="Pending" value={summary.pending} icon={Hourglass} accent="amber" />
            <KpiCard
              title="Completion"
              value={`${summary.completionPercentage}%`}
              icon={TrendingUp}
              accent="emerald"
            />
          </div>

          {(reportData?.softwareSummaries || []).length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-800">
                Summary by Software
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-600">
                      <th className="py-2.5 px-4">Software</th>
                      <th className="py-2.5 px-4 text-right">Records</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                      <th className="py-2.5 px-4 text-right text-emerald-700">Completed</th>
                      <th className="py-2.5 px-4 text-right text-blue-900">Processing</th>
                      <th className="py-2.5 px-4 text-right text-amber-700">Pending</th>
                      <th className="py-2.5 px-4 w-40">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.softwareSummaries.map((s) => (
                      <tr key={s.softwareId}>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {s.softwareName}
                        </td>
                        <td className="py-2.5 px-4 text-right">{s.recordsCount}</td>
                        <td className="py-2.5 px-4 text-right font-semibold">{s.totalData}</td>
                        <td className="py-2.5 px-4 text-right text-emerald-700">{s.completed}</td>
                        <td className="py-2.5 px-4 text-right text-blue-900">{s.processing}</td>
                        <td className="py-2.5 px-4 text-right text-amber-700">{s.pending}</td>
                        <td className="py-2.5 px-4">
                          <ProgressBar percentage={s.completionPercentage} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-800">
              Detailed Records
            </div>
            {loadingReports ? (
              <div className="p-4 text-xs text-slate-500">Loading...</div>
            ) : (reportData?.records || []).length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-600">
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Software</th>
                      <th className="py-2.5 px-4">Data Type</th>
                      <th className="py-2.5 px-4">Dataset</th>
                      <th className="py-2.5 px-4">Location</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                      <th className="py-2.5 px-4 text-right">Completed</th>
                      <th className="py-2.5 px-4 text-right">Processing</th>
                      <th className="py-2.5 px-4 text-right">Pending</th>
                      <th className="py-2.5 px-4">User</th>
                      {isAdmin && <th className="py-2.5 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.records.map((r) => (
                      <tr key={r._id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                          {new Date(r.entryDate).toISOString().slice(0, 10)}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {r.softwareName}
                        </td>
                        <td className="py-2.5 px-4 text-blue-900">{r.dataType}</td>
                        <td className="py-2.5 px-4">{r.datasetName}</td>
                        <td className="py-2.5 px-4 text-slate-700">{r.location}</td>
                        <td className="py-2.5 px-4 text-right font-semibold">
                          {r.totalData.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right text-emerald-700">
                          {r.completed.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right text-blue-900">
                          {r.processing.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right text-amber-700">
                          {r.pending.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{r.createdByName}</td>
                        {isAdmin && (
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex gap-1.5">
                              <button
                                onClick={() => setEditingRecord({ ...r })}
                                className="p-1.5 rounded border border-slate-200 text-slate-600 hover:text-blue-900 hover:bg-slate-100"
                                title="Edit record"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(r._id)}
                                className="p-1.5 rounded border border-slate-200 text-slate-600 hover:text-rose-700 hover:bg-rose-50"
                                title="Delete record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Report Record Modal (Admin) */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Edit Record — {editingRecord.softwareName}
              </h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEditRecord} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data Type</label>
                  {editingSoftware?.dataTypes?.length > 0 ? (
                    <select
                      value={editingRecord.dataType}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, dataType: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                    >
                      {editingSoftware.dataTypes.map((dt) => (
                        <option key={dt} value={dt}>
                          {dt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={editingRecord.dataType}
                      onChange={(e) =>
                        setEditingRecord({ ...editingRecord, dataType: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dataset Name/ID</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.datasetName}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, datasetName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.location}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, location: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Entry Date</label>
                  <input
                    type="date"
                    required
                    value={
                      editingRecord.entryDate
                        ? new Date(editingRecord.entryDate).toISOString().slice(0, 10)
                        : ''
                    }
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, entryDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingRecord.totalData}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, totalData: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-emerald-700 mb-1">Completed</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingRecord.completed}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, completed: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-blue-900 mb-1">Processing</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingRecord.processing}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, processing: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-amber-700 mb-1">Pending</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingRecord.pending}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, pending: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows="2"
                  value={editingRecord.notes || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" /> {editSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
