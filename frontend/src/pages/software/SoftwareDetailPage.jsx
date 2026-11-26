import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest, triggerFileDownload } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { getDateRangeForPeriod } from '../../utils/dateFilters';


import KpiCard from '../../components/common/KpiCard';
import ProgressBar from '../../components/common/ProgressBar';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';


import {
  ArrowLeft,
  PlusSquare,
  Database,
  CheckCircle2,
  Clock,
  Hourglass,
  TrendingUp,
  Layers,
  FileSpreadsheet,
  FileText,
  Download,
  Trash2,
  Edit3,
  Search,
  ShieldAlert,
  X,
  Save,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const STATUS_COLORS = {
  Completed: '#10b981',
  Processing: '#1e40af',
  Pending: '#f59e0b',
};

function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-md text-xs min-w-[165px]">
      <div className="font-semibold text-slate-900 pb-1.5 mb-1.5 border-b border-slate-100">
        {label}
      </div>
      <div className="space-y-1">
        {payload.map((entry) => {
          const val = Number(entry.value) || 0;
          const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
          return (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
              </span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {val.toLocaleString()} <span className="text-slate-400 font-normal">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SoftwareDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('records');

  const [dataType, setDataType] = useState('all');
  const [period, setPeriod] = useState('all'); // 'all' | 'today' | 'month' | 'year'
  const [search, setSearch] = useState('');

  const [editingRecord, setEditingRecord] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [previewExcelModal, setPreviewExcelModal] = useState(null);





  const fetchSoftwareDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { startDate, endDate } = getDateRangeForPeriod(period);
      const params = new URLSearchParams();
      if (dataType && dataType !== 'all') params.set('dataType', dataType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (search.trim()) params.set('search', search.trim());

      const res = await apiRequest(`/software/${id}/dashboard?${params.toString()}`);
      setDashboard(res);
    } catch (err) {
      setError(err.message || 'Failed to load software dashboard.');
    } finally {
      setLoading(false);
    }
  }, [id, dataType, period, search]);

  useEffect(() => {
    setDataType('all');
    setPeriod('all');
    setSearch('');
  }, [id]);

  useEffect(() => {
    fetchSoftwareDashboard();
  }, [fetchSoftwareDashboard]);

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await apiRequest(`/records/${recordId}`, { method: 'DELETE' });
      fetchSoftwareDashboard();
    } catch (err) {
      alert(err.message);
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
      fetchSoftwareDashboard();
    } catch (err) {
      setEditError(err.message || 'Failed to update record.');
    } finally {
      setEditSaving(false);
    }
  };



  const handleExportSoftwareReport = async (format) => {
    try {
      const { startDate, endDate } = getDateRangeForPeriod(period);
      const params = new URLSearchParams({ softwareId: id });
      if (dataType && dataType !== 'all') params.set('dataType', dataType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (search.trim()) params.set('search', search.trim());

      const code = dashboard?.software?.code || 'software';
      await triggerFileDownload(
        `/reports/export/${format}?${params.toString()}`,
        `${code}_report.${format}`
      );
    } catch (err) {
      alert(err.message);
    }
  };


  

  const handleInspectExcel = async (excelId) => {
    try {
      const res = await apiRequest(`/excel/${excelId}`);
      setPreviewExcelModal(res.excelUpload);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading && !dashboard) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-sm text-slate-500">
        Loading software dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto my-10 bg-white border border-slate-200 rounded-xl p-8 text-center">
        <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">Unable to Open Software Page</h2>
        <p className="text-sm text-slate-600 mb-5">{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 rounded-lg bg-blue-900 text-white text-xs font-semibold"
        >
          Back to Summary Dashboard
        </button>
      </div>
    );
  }

  const software = dashboard?.software;
  const isAdmin = user?.role === 'Admin';
  const kpis = dashboard?.kpis || {};
  const records = dashboard?.records || [];
  const dataTypeBreakdown = dashboard?.dataTypeBreakdown || [];
  const timeline = dashboard?.timeline || [];
  const metricSummaries = dashboard?.metricSummaries || [];
  const excelUploads = dashboard?.excelUploads || [];

  const pieData = [
    { name: 'Completed', value: kpis.completed || 0, color: STATUS_COLORS.Completed },
    { name: 'Processing', value: kpis.processing || 0, color: STATUS_COLORS.Processing },
    { name: 'Pending', value: kpis.pending || 0, color: STATUS_COLORS.Pending },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-5 pb-6">
      {/* Compact Header Clearly Displaying Selected Software Name */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              {isAdmin && (
                <>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-900 mr-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Summary
                  </button>
                  <span className="text-slate-300">|</span>
                </>
              )}
              <h1 className="text-xl font-bold text-slate-900">{software?.name}</h1>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                {software?.code}
              </span>
              <StatusBadge
                label={software?.isActive ? 'Active' : 'Inactive'}
                variant={software?.isActive ? 'active' : 'inactive'}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {software?.description && (
                <span className="truncate max-w-xl">{software.description}</span>
              )}
              {(software?.dataTypes || []).map((dt) => (
                <span
                  key={dt}
                  className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 font-medium"
                >
                  {dt}
                </span>
              ))}
            </div>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => handleExportSoftwareReport('csv')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button
                onClick={() => handleExportSoftwareReport('json')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" /> JSON
              </button>
              <button
                onClick={() => navigate(`/data-entry?softwareId=${software?._id}`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold"
              >
                <PlusSquare className="w-3.5 h-3.5" /> Add Data
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Clean Filter Bar (No Reset Button) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Search Dataset / Location
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${software?.name}...`}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Data Type</label>
            <select
              value={dataType}
              onChange={(e) => setDataType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-800"
            >
              <option value="all">All Data Types</option>
              {(software?.dataTypes || []).map((dt) => (
                <option key={dt} value={dt}>
                  {dt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-800"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <KpiCard title="Datasets" value={kpis.totalDatasets || 0} icon={Layers} accent="blue" />
        <KpiCard title="Total Data" value={kpis.totalData || 0} icon={Database} accent="slate" />
        <KpiCard
          title="Completed"
          value={kpis.completed || 0}
          icon={CheckCircle2}
          accent="emerald"
        />
        <KpiCard title="Processing" value={kpis.processing || 0} icon={Clock} accent="blue" />
        <KpiCard title="Pending" value={kpis.pending || 0} icon={Hourglass} accent="amber" />
        <KpiCard
          title="Completion"
          value={`${kpis.completionPercentage || 0}%`}
          icon={TrendingUp}
          accent="emerald"
        />
      </div>

      {/* Configured Metric Summaries */}
      {metricSummaries.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3">
            {software?.name} — Metric Averages
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {metricSummaries.map((m) => (
              <div key={m.key} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs font-medium text-slate-600">{m.label}</div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-lg font-bold text-slate-900">
                    {m.type === 'percentage' ? `${m.avg}%` : m.avg.toLocaleString()}
                    {m.unit && m.type !== 'percentage' ? ` ${m.unit}` : ''}
                  </span>
                  <span className="text-[11px] text-slate-500">{m.count} entries</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {software?.name} — Progress Overview
              </h2>
              <p className="text-xs text-slate-500">
                Daily volume breakdown across Completed, Processing, and Pending
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Completed: {(kpis.completed || 0).toLocaleString()}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-900 border border-blue-200">
                Processing: {(kpis.processing || 0).toLocaleString()}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                Pending: {(kpis.pending || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {timeline.length === 0 ? (
            <div className="h-64 flex items-center justify-center border border-dashed border-slate-300 rounded-lg text-xs text-slate-500">
              No records entered for {software?.name} yet.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timeline}
                  margin={{ top: 10, right: 16, left: 0, bottom: 8 }}
                  barGap={8}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                  />
                  <Bar
                    dataKey="completed"
                    name="Completed"
                    fill={STATUS_COLORS.Completed}
                    barSize={32}
                    minPointSize={6}
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="processing"
                    name="Processing"
                    fill={STATUS_COLORS.Processing}
                    barSize={32}
                    minPointSize={6}
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="pending"
                    name="Pending"
                    fill={STATUS_COLORS.Pending}
                    barSize={32}
                    minPointSize={6}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col">
          <h2 className="text-base font-bold text-slate-900">
            {software?.name} — Status Share
          </h2>
          <p className="text-xs text-slate-500 mb-3">Distribution across active records</p>

          {pieData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center border border-dashed border-slate-300 rounded-lg text-xs text-slate-500">
              No data yet
            </div>
          ) : (
            <>
              <div className="h-44 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] font-medium text-slate-500">Done</span>
                  <span className="text-sm font-bold text-slate-900">
                    {kpis.completionPercentage || 0}%
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed
                  </span>
                  <span className="font-semibold text-slate-900">
                    {(kpis.completed || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-800" /> Processing
                  </span>
                  <span className="font-semibold text-slate-900">
                    {(kpis.processing || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending
                  </span>
                  <span className="font-semibold text-slate-900">
                    {(kpis.pending || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </>
          )}

          {dataTypeBreakdown.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
              {dataTypeBreakdown.map((dt) => (
                <div key={dt.dataType} className="text-xs">
                  <div className="flex justify-between text-slate-700 mb-1">
                    <span className="font-medium">{dt.dataType}</span>
                    <span className="text-slate-500">
                      {dt.completed.toLocaleString()}/{dt.totalData.toLocaleString()}
                    </span>
                  </div>
                  <ProgressBar percentage={dt.completionPercentage} height="h-1.5" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs: Records & Excel (Excel & Actions only for Admin) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="border-b border-slate-200 px-4 flex flex-wrap gap-1 bg-slate-50/70">
          <button
            onClick={() => setActiveTab('records')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 ${
              activeTab === 'records'
                ? 'border-blue-900 text-blue-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {software?.name} Records ({records.length})
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('excel')}
              className={`px-4 py-3 text-xs font-semibold border-b-2 ${
                activeTab === 'excel'
                  ? 'border-blue-900 text-blue-900 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Excel &amp; Class Details ({excelUploads.length})
            </button>
          )}
        </div>

        {activeTab === 'records' && (
          <div>
            {records.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Database}
                  title={`No Data Records for ${software?.name}`}
                  description={
                    isAdmin
                      ? 'Use the Data Entry form to record datasets, location, and metrics for this software.'
                      : 'No data records have been recorded for this software yet.'
                  }
                  actionLabel={isAdmin ? `Add Entry for ${software?.name}` : undefined}
                  onAction={
                    isAdmin ? () => navigate(`/data-entry?softwareId=${software?._id}`) : undefined
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-600">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Dataset</th>
                      <th className="py-3 px-4">Data Type</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-right text-emerald-700">Completed</th>
                      <th className="py-3 px-4 text-right text-blue-900">Processing</th>
                      <th className="py-3 px-4 text-right text-amber-700">Pending</th>
                      <th className="py-3 px-4">Metrics</th>
                      <th className="py-3 px-4">User</th>
                      {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {records.map((rec) => (
                      <tr key={rec._id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {new Date(rec.entryDate).toISOString().slice(0, 10)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{rec.datasetName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 text-[11px]">
                            {rec.dataType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{rec.location}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">
                          {rec.totalData.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-700 font-medium">
                          {rec.completed.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-blue-900 font-medium">
                          {rec.processing.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-amber-700 font-medium">
                          {rec.pending.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(software?.metricFields || []).map((field) => {
                              const val = rec.metrics?.[field.key];
                              if (val === undefined || val === null || val === '') return null;
                              return (
                                <span
                                  key={field.key}
                                  className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-700"
                                >
                                  {field.label}:{' '}
                                  <strong className="text-slate-900">
                                    {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : val}
                                    {field.unit ? ` ${field.unit}` : ''}
                                  </strong>
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{rec.createdByName}</td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex gap-1.5">
                              <button
                                onClick={() => setEditingRecord({ ...rec })}
                                className="p-1.5 rounded border border-slate-200 text-slate-600 hover:text-blue-900 hover:bg-slate-100"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(rec._id)}
                                className="p-1.5 rounded border border-slate-200 text-slate-600 hover:text-rose-700 hover:bg-rose-50"
                                title="Delete"
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
        )}

        {activeTab === 'excel' && (
          <div className="p-5">
            {excelUploads.length === 0 ? (
              <EmptyState
                icon={FileSpreadsheet}
                title={`No Excel Files for ${software?.name}`}
                description={
                  user?.role === 'Admin'
                    ? 'Upload an Excel file from the Excel & Classes page.'
                    : `No Excel files available for ${software?.name} yet.`
                }
                actionLabel={user?.role === 'Admin' ? 'Open Excel & Classes' : undefined}
                onAction={user?.role === 'Admin' ? () => navigate('/excel') : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {excelUploads.map((ex) => (
                  <div
                    key={ex._id}
                    className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{ex.originalFileName}</h3>
                        <p className="text-xs text-slate-500">
                          Sheet: {ex.selectedSheet} &bull; {ex.totalRows} rows &bull;{' '}
                          {(ex.extractedClasses || []).length} classes
                        </p>
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(ex.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleInspectExcel(ex._id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                      >
                        View Data
                      </button>
                      <button
                        onClick={() =>
                          triggerFileDownload(`/excel/${ex._id}/download`, ex.originalFileName)
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" /> .xlsx
                      </button>
                      <button
                        onClick={() =>
                          triggerFileDownload(`/excel/${ex._id}/txt`, `${ex.originalFileName}_classes.txt`)
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
                      >
                        <FileText className="w-3.5 h-3.5" /> .txt Classes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Edit Record — {software?.name}
              </h3>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400">
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
                  <select
                    value={editingRecord.dataType}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, dataType: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                  >
                    {(software?.dataTypes || []).map((dt) => (
                      <option key={dt} value={dt}>
                        {dt}
                      </option>
                    ))}
                  </select>
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
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-900 text-white font-semibold"
                >
                  <Save className="w-3.5 h-3.5" /> {editSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Inspector Modal */}
      {previewExcelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {previewExcelModal.originalFileName}
              </h3>
              <button onClick={() => setPreviewExcelModal(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto space-y-4">
              {(previewExcelModal.sheets || []).map((sheet) => (
                <div key={sheet.sheetName} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-bold text-slate-800">
                    Sheet: {sheet.sheetName} ({sheet.rowCount} rows)
                  </div>
                  <div className="overflow-x-auto max-h-60">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          {sheet.headers.map((h, i) => (
                            <th key={i} className="py-2 px-3 text-slate-700 font-semibold whitespace-nowrap">
                              {h || `(Col ${i + 1})`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {sheet.rows.slice(0, 100).map((row, rIdx) => (
                          <tr key={rIdx}>
                            {sheet.headers.map((_, cIdx) => (
                              <td key={cIdx} className="py-1.5 px-3 text-slate-800 font-mono whitespace-nowrap">
                                {row[cIdx]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
