import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest, triggerFileDownload } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/common/EmptyState';
import {
  FileSpreadsheet,
  Upload,
  Download,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function ExcelManagementPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [uploads, setUploads] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Currently shown file details at the bottom
  const [activeExcel, setActiveExcel] = useState(null);
  const [activeSheetName, setActiveSheetName] = useState('');
  const [selectedColIdx, setSelectedColIdx] = useState(0);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadExcelDetails = useCallback(async (id) => {
    if (!id) return;
    setLoadingDetails(true);
    try {
      const res = await apiRequest(`/excel/${id}`);
      const rec = res.excelUpload;
      setActiveExcel(rec);
      setActiveSheetName(rec.selectedSheet || rec.sheets?.[0]?.sheetName || '');
      setSelectedColIdx(rec.selectedClassColumn || 0);
    } catch {
      // ignore if deleted
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  const fetchHistory = useCallback(
    async (selectId = null) => {
      setLoadingHistory(true);
      try {
        const res = await apiRequest('/excel');
        const list = res.uploads || [];
        setUploads(list);
        const targetId = selectId || list[0]?._id;
        if (targetId) {
          await loadExcelDetails(targetId);
        } else {
          setActiveExcel(null);
        }
      } catch {
        setUploads([]);
      } finally {
        setLoadingHistory(false);
      }
    },
    [loadExcelDetails]
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setFeedback({ type: 'error', text: 'Please choose an Excel file first.' });
      return;
    }

    setFeedback(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await apiRequest('/excel/upload', {
        method: 'POST',
        body: formData,
      });

      setFeedback({ type: 'success', text: res.message || 'Excel file uploaded successfully.' });
      setSelectedFile(null);
      const input = document.getElementById('excel-file-input');
      if (input) input.value = '';

      const saved = res.excelUpload;
      setActiveExcel(saved);
      setActiveSheetName(saved.selectedSheet || saved.sheets?.[0]?.sheetName || '');
      setSelectedColIdx(saved.selectedClassColumn || 0);

      // Refresh upload history list
      const listRes = await apiRequest('/excel');
      setUploads(listRes.uploads || []);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Upload failed.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this Excel file?')) return;
    try {
      await apiRequest(`/excel/${id}`, { method: 'DELETE' });
      if (activeExcel?._id === id) {
        setActiveExcel(null);
      }
      await fetchHistory();
    } catch (err) {
      alert(err.message);
    }
  };

  const extractClasses = (sheet, colIdx) => {
    if (!sheet) return [];
    const seen = new Set();
    const out = [];
    for (const row of sheet.rows || []) {
      const val = row[colIdx] !== undefined && row[colIdx] !== null ? String(row[colIdx]) : '';
      if (val === '') continue;
      if (!seen.has(val)) {
        seen.add(val);
        out.push(val);
      }
    }
    return out;
  };

  const currentSheet =
    activeExcel?.sheets?.find((s) => s.sheetName === activeSheetName) ||
    activeExcel?.sheets?.[0] ||
    null;

  const extractedClasses = extractClasses(currentSheet, selectedColIdx);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Excel &amp; Classes</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Upload an Excel file to view its exact sheets, rows, and classes below.
        </p>
      </div>

      {/* TOP: Simple Upload File Card */}
      {isAdmin && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Upload Excel File</h2>

          {feedback && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <input
              id="excel-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                setSelectedFile(e.target.files?.[0] || null);
                setFeedback(null);
              }}
              className="flex-1 text-xs text-slate-700 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-800 file:font-semibold hover:file:bg-slate-200 bg-white border border-slate-300 rounded-lg cursor-pointer"
            />
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
            </button>
          </form>
        </div>
      )}

      {/* BOTTOM: Uploaded Files & Full Extracted Details */}
      <div className="space-y-6">
        {/* Upload History List */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
            <h2 className="text-sm font-bold text-slate-900">
              Uploaded Files ({uploads.length})
            </h2>
          </div>

          {loadingHistory ? (
            <div className="p-6 text-xs text-slate-500">Loading files...</div>
          ) : uploads.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={FileSpreadsheet}
                title="No Excel Files Uploaded Yet"
                description={
                  isAdmin
                    ? 'Upload an Excel file above to view all sheets, rows, and classes here.'
                    : 'No Excel files have been uploaded yet.'
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-600">
                    <th className="py-2.5 px-4">File Name</th>
                    <th className="py-2.5 px-4">Sheets / Rows</th>
                    <th className="py-2.5 px-4">Classes</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {uploads.map((u) => {
                    const isSelected = activeExcel?._id === u._id;
                    return (
                      <tr
                        key={u._id}
                        onClick={() => loadExcelDetails(u._id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {u.originalFileName}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {u.sheets?.length || 0} sheet(s) &bull; {u.totalRows} rows
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-blue-900">
                          {u.extractedClasses?.length || 0}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">
                          {new Date(u.createdAt).toLocaleString()}
                        </td>
                        <td
                          className="py-2.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() =>
                                triggerFileDownload(`/excel/${u._id}/download`, u.originalFileName)
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-900 text-white font-semibold"
                            >
                              <Download className="w-3 h-3" /> .xlsx
                            </button>
                            <button
                              onClick={() =>
                                triggerFileDownload(
                                  `/excel/${u._id}/txt`,
                                  `${u.originalFileName}_classes.txt`
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 text-white font-semibold"
                            >
                              <FileText className="w-3 h-3" /> .txt
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(u._id)}
                                className="p-1 rounded border border-slate-200 text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Inline Details Display at Bottom */}
        {loadingDetails && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-xs text-slate-500">
            Loading Excel details...
          </div>
        )}

        {activeExcel && !loadingDetails && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  File Details: {activeExcel.originalFileName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeExcel.sheets?.length || 0} sheet(s) &bull; {activeExcel.totalRows} total rows &bull; Uploaded {new Date(activeExcel.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    triggerFileDownload(
                      `/excel/${activeExcel._id}/download`,
                      activeExcel.originalFileName
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> Download Excel
                </button>
                <button
                  onClick={() =>
                    triggerFileDownload(
                      `/excel/${activeExcel._id}/txt?sheetName=${encodeURIComponent(
                        activeSheetName
                      )}&colIdx=${selectedColIdx}`,
                      `${activeExcel.originalFileName}_classes.txt`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold"
                >
                  <FileText className="w-3.5 h-3.5" /> Download TXT ({extractedClasses.length} classes)
                </button>
              </div>
            </div>

            {/* Sheet Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {(activeExcel.sheets || []).map((s) => (
                <button
                  key={s.sheetName}
                  type="button"
                  onClick={() => {
                    setActiveSheetName(s.sheetName);
                    setSelectedColIdx(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    activeSheetName === s.sheetName
                      ? 'bg-blue-900 border-blue-900 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {s.sheetName} ({s.rowCount} rows)
                </button>
              ))}
            </div>

            {currentSheet && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Exact Rows & Columns Table */}
                <div className="lg:col-span-2 border border-slate-200 rounded-lg overflow-auto max-h-96">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 text-slate-500">#</th>
                        {currentSheet.headers.map((h, i) => (
                          <th
                            key={i}
                            onClick={() => setSelectedColIdx(i)}
                            title="Click column to extract classes"
                            className={`py-2 px-3 whitespace-nowrap cursor-pointer ${
                              selectedColIdx === i
                                ? 'bg-blue-100 text-blue-900 font-bold'
                                : 'text-slate-700 font-semibold'
                            }`}
                          >
                            {h || `(Col ${i + 1})`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {currentSheet.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          <td className="py-1.5 px-3 text-slate-400 font-mono">{rIdx + 1}</td>
                          {currentSheet.headers.map((_, cIdx) => (
                            <td
                              key={cIdx}
                              className={`py-1.5 px-3 whitespace-nowrap font-mono ${
                                selectedColIdx === cIdx
                                  ? 'bg-blue-50/40 text-slate-900 font-medium'
                                  : 'text-slate-700'
                              }`}
                            >
                              {row[cIdx]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Extracted Classes List */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">Class Names</span>
                    <span className="font-semibold text-blue-900">
                      {extractedClasses.length} classes
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Class Column
                    </label>
                    <select
                      value={selectedColIdx}
                      onChange={(e) => setSelectedColIdx(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                    >
                      {currentSheet.headers.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h || '(Unnamed)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <pre className="flex-1 p-3 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-800 max-h-72 overflow-y-auto whitespace-pre">
                    {extractedClasses.join('\n') || '(No classes in this column)'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
