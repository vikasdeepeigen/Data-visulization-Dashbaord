import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { getDateRangeForPeriod } from '../../utils/dateFilters';
import KpiCard from '../../components/common/KpiCard';
import ProgressBar from '../../components/common/ProgressBar';
import EmptyState from '../../components/common/EmptyState';
import {
  Cpu,
  Database,
  Layers,
  CheckCircle2,
  Clock,
  Hourglass,
  TrendingUp,
  Search,
  ArrowUpRight,
  PlusSquare,
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


export default function SummaryDashboardPage() {
  const { user, accessibleSoftware } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [period, setPeriod] = useState('all'); // 'all' | 'today' | 'month' | 'year'
  const [dataType, setDataType] = useState('all');
  const [search, setSearch] = useState('');





  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { startDate, endDate } = getDateRangeForPeriod(period);
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (dataType && dataType !== 'all') params.set('dataType', dataType);
      if (search.trim()) params.set('search', search.trim());

      const res = await apiRequest(`/dashboard/summary?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load summary dashboard.');
    } finally {
      setLoading(false);
    }
  }, [period, dataType, search]);





  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const kpis = data?.kpis || {
    totalSoftware: 0,
    totalDatasets: 0,
    totalRecords: 0,
    totalData: 0,
    completed: 0,
    processing: 0,
    pending: 0,
    completionPercentage: 0,
  };

  const softwareComparison = data?.softwareComparison || [];

  const pieData = [
    { name: 'Completed', value: kpis.completed, color: STATUS_COLORS.Completed },
    { name: 'Processing', value: kpis.processing, color: STATUS_COLORS.Processing },
    { name: 'Pending', value: kpis.pending, color: STATUS_COLORS.Pending },
  ].filter((d) => d.value > 0);



  const chartData = softwareComparison.map((sw) => ({
    softwareId: sw.softwareId,
    shortName: sw.name.length > 16 ? `${sw.name.slice(0, 15)}…` : sw.name,
    fullName: sw.name,
    Completed: sw.completed,
    Processing: sw.processing,
    Pending: sw.pending,
  }));

  

  if (accessibleSoftware.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Summary Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Welcome, {user?.fullName}.</p>
        </div>
        <EmptyState
          icon={Cpu}
          title={user?.role === 'Admin' ? 'No Software Added Yet' : 'No Software Assigned Yet'}
          description={
            user?.role === 'Admin'
              ? 'Open the "Add Software" page in the sidebar to add your first software tool.'
              : 'Your User account does not have any software permissions yet. Ask an Admin to assign software access.'
          }
          actionLabel={user?.role === 'Admin' ? 'Add Software' : undefined}
          onAction={user?.role === 'Admin' ? () => navigate('/add-software') : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Summary Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Overall progress across {kpis.totalSoftware} software tool{kpis.totalSoftware === 1 ? '' : 's'}. Click any software to view its dedicated dashboard.
          </p>
        </div>
        <button
          onClick={() => navigate('/data-entry')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold self-start transition-colors"
        >
          <PlusSquare className="w-4 h-4" /> New Data Entry
        </button>
      </div>

      {/* Clean Filter Bar (No Reset Button) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Software, dataset, location..."
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
              {(data?.availableDataTypes || []).map((dt) => (
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

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3.5">
        <KpiCard title="Software" value={kpis.totalSoftware} icon={Cpu} accent="blue" />
        <KpiCard title="Datasets" value={kpis.totalDatasets} icon={Layers} accent="slate" />
        <KpiCard title="Total Data" value={kpis.totalData} icon={Database} accent="slate" />
        <KpiCard title="Completed" value={kpis.completed} icon={CheckCircle2} accent="emerald" />
        <KpiCard title="Processing" value={kpis.processing} icon={Clock} accent="blue" />
        <KpiCard title="Pending" value={kpis.pending} icon={Hourglass} accent="amber" />
        <KpiCard
          title="Completion"
          value={`${kpis.completionPercentage}%`}
          icon={TrendingUp}
          accent="emerald"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Software Comparison</h2>
              <p className="text-xs text-slate-500">
                Click any bar to open that software&apos;s dedicated dashboard
              </p>
            </div>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">
              Loading chart...
            </div>
          ) : kpis.totalData === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-lg text-center p-4">
              <p className="text-sm font-medium text-slate-700">No data records yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Submit data on the Data Entry page to view charts.
              </p>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 12 }}
                  barGap={8}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="shortName"
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
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                    }}
                    cursor={{ fill: '#f8fafc' }}
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.fullName || label
                    }
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  />
                  <Bar
                    dataKey="Completed"
                    fill={STATUS_COLORS.Completed}
                    barSize={30}
                    minPointSize={6}
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(entry) =>
                      entry?.softwareId && navigate(`/software/${entry.softwareId}`)
                    }
                  />
                  <Bar
                    dataKey="Processing"
                    fill={STATUS_COLORS.Processing}
                    barSize={30}
                    minPointSize={6}
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(entry) =>
                      entry?.softwareId && navigate(`/software/${entry.softwareId}`)
                    }
                  />
                  <Bar
                    dataKey="Pending"
                    fill={STATUS_COLORS.Pending}
                    barSize={30}
                    minPointSize={6}
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(entry) =>
                      entry?.softwareId && navigate(`/software/${entry.softwareId}`)
                    }
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col">
          <h2 className="text-base font-bold text-slate-900">Overall Status</h2>
          <p className="text-xs text-slate-500 mb-3">Distribution across all records</p>

          {pieData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center border border-dashed border-slate-300 rounded-lg text-xs text-slate-500">
              No records entered yet
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div className="h-52 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={78}
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
                  <span className="text-[11px] font-medium text-slate-500">Total</span>
                  <span className="text-base font-bold text-slate-900">
                    {kpis.totalData.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed
                  </span>
                  <span className="font-semibold text-slate-900">
                    {kpis.completed.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-800" /> Processing
                  </span>
                  <span className="font-semibold text-slate-900">
                    {kpis.processing.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending
                  </span>
                  <span className="font-semibold text-slate-900">
                    {kpis.pending.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Software Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Software Summary</h2>
            <p className="text-xs text-slate-500">
              Click any row to open that software&apos;s dedicated dashboard
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-semibold">
            {softwareComparison.length} Tools
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-600">
                <th className="py-3 px-4">Software Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4 text-right">Datasets</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right text-emerald-700">Completed</th>
                <th className="py-3 px-4 text-right text-blue-900">Processing</th>
                <th className="py-3 px-4 text-right text-amber-700">Pending</th>
                <th className="py-3 px-4 w-44">Progress</th>
                <th className="py-3 px-4 text-right">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {softwareComparison.map((sw) => (
                <tr
                  key={sw.softwareId}
                  onClick={() => navigate(`/software/${sw.softwareId}`)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{sw.name}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {sw.code}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-700">{sw.totalDatasets}</td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                    {sw.totalData.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-700 font-medium">
                    {sw.completed.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right text-blue-900 font-medium">
                    {sw.processing.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right text-amber-700 font-medium">
                    {sw.pending.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <ProgressBar percentage={sw.completionPercentage} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center gap-1 text-blue-900 font-semibold">
                      Open <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
