import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Save, X, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function AddEditSoftwarePage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { refreshSoftware } = useAuth();

  const [name, setName] = useState('');
  const [dataTypes, setDataTypes] = useState([]);
  const [dataTypeInput, setDataTypeInput] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    if (!isEditing) {
      setName('');
      setDataTypes([]);
      setDataTypeInput('');
      setDescription('');
      setLoading(false);
      setBanner(null);
      return;
    }

    const fetchSoftware = async () => {
      setLoading(true);
      setBanner(null);
      try {
        const res = await apiRequest(`/software/${id}`);
        const sw = res.software;
        setName(sw.name || '');
        setDataTypes([...(sw.dataTypes || [])]);
        setDataTypeInput('');
        setDescription(sw.description || '');
      } catch (err) {
        setBanner({ type: 'error', text: err.message || 'Failed to load software details.' });
      } finally {
        setLoading(false);
      }
    };

    fetchSoftware();
  }, [id, isEditing]);

  const handleAddDataType = () => {
    const val = dataTypeInput.trim();
    if (!val || dataTypes.includes(val)) return;
    setDataTypes([...dataTypes, val]);
    setDataTypeInput('');
  };

  const handleRemoveDataType = (dt) => {
    setDataTypes(dataTypes.filter((item) => item !== dt));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBanner(null);

    if (!name.trim()) {
      setBanner({ type: 'error', text: 'Software Name is required.' });
      return;
    }

    const finalDataTypes = [...dataTypes];
    if (dataTypeInput.trim()) {
      dataTypeInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((dt) => {
          if (!finalDataTypes.includes(dt)) {
            finalDataTypes.push(dt);
          }
        });
    }

    if (finalDataTypes.length === 0) {
      setBanner({ type: 'error', text: 'Please enter at least one Data Type.' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        dataTypes: finalDataTypes,
        description: description.trim(),
      };

      const res = isEditing
        ? await apiRequest(`/software/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await apiRequest('/software', { method: 'POST', body: JSON.stringify(payload) });

      await refreshSoftware();
      setBanner({ type: 'success', text: res.message });
      setTimeout(() => {
        navigate('/software-list');
      }, 500);
    } catch (err) {
      setBanner({ type: 'error', text: err.message || 'Failed to save software.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading software...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <button
          type="button"
          onClick={() => navigate('/software-list')}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-900 mb-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Software List
        </button>
        <h1 className="text-2xl font-bold text-slate-900">
          {isEditing ? `Edit Software: ${name}` : 'Add Software'}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Enter software name, data type, and description.
        </p>
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

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-5 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Software Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SAM-2 Bounding Box – 2D"
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Data Type <span className="text-rose-600">*</span>
            </label>
            {dataTypes.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {dataTypes.map((dt) => (
                  <span
                    key={dt}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-xs font-medium text-blue-900"
                  >
                    <span>{dt}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDataType(dt)}
                      className="text-blue-700 hover:text-rose-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={dataTypeInput}
                onChange={(e) => setDataTypeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDataType();
                  }
                }}
                placeholder="e.g. 2D, 3D, FSD, Lane, MPC, Semantic Mask"
                className="flex-1 px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-800"
              />
              <button
                type="button"
                onClick={handleAddDataType}
                className="px-4 py-2.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold"
              >
                + Add
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Type a data type (or multiple separated by comma) and click + Add or Save directly.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter software description..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-800"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/software-list')}
              className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : isEditing ? 'Update Software' : 'Save Software'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
