import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import { Plus, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function UsersPermissionsPage() {
  const { user: currentUser, refreshUserSession } = useAuth();

  const [usersList, setUsersList] = useState([]);
  const [softwareList, setSoftwareList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);

  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'User',
    isActive: true,
    assignedSoftware: [],
  });
  const [savingUser, setSavingUser] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usrRes, swRes] = await Promise.all([
        apiRequest('/users'),
        apiRequest('/software?includeInactive=true'),
      ]);
      setUsersList(usrRes.users || []);
      setSoftwareList(swRes.software || []);
    } catch (err) {
      setBanner({ type: 'error', text: err.message || 'Failed to load users.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateUserForm = () => {
    setEditingUserId(null);
    setUserForm({
      fullName: '',
      email: '',
      password: '',
      role: 'User',
      isActive: true,
      assignedSoftware: [],
    });
    setUserFormOpen(true);
  };

  const openEditUserForm = (u) => {
    setEditingUserId(u._id);
    setUserForm({
      fullName: u.fullName,
      email: u.email,
      password: '',
      role: u.role,
      isActive: u.isActive,
      assignedSoftware: (u.assignedSoftware || []).map((s) => (s._id ? s._id : s)),
    });
    setUserFormOpen(true);
  };

  const toggleUserSoftware = (swId) => {
    setUserForm((prev) => {
      const exists = prev.assignedSoftware.includes(swId);
      return {
        ...prev,
        assignedSoftware: exists
          ? prev.assignedSoftware.filter((id) => id !== swId)
          : [...prev.assignedSoftware, swId],
      };
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setBanner(null);
    setSavingUser(true);
    try {
      const payload = {
        fullName: userForm.fullName,
        email: userForm.email,
        role: userForm.role,
        isActive: userForm.isActive,
        assignedSoftware: userForm.assignedSoftware,
      };
      if (userForm.password.trim()) {
        payload.password = userForm.password.trim();
      }

      const res = editingUserId
        ? await apiRequest(`/users/${editingUserId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : await apiRequest('/users', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

      setBanner({ type: 'success', text: res.message });
      setUserFormOpen(false);
      await loadData();
      if (editingUserId === currentUser?.id) {
        await refreshUserSession();
      }
    } catch (err) {
      setBanner({ type: 'error', text: err.message || 'Failed to save user.' });
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Delete user ${u.fullName} (${u.email})?`)) return;
    try {
      await apiRequest(`/users/${u._id}`, { method: 'DELETE' });
      setBanner({ type: 'success', text: `Deleted user ${u.email}.` });
      loadData();
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users &amp; Permissions</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Create users and assign which software tools each user can access.
          </p>
        </div>
        <button
          onClick={openCreateUserForm}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add User
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
          <div className="p-6 text-sm text-slate-500">Loading users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-600">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Software</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {usersList.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{u.fullName}</div>
                      <div className="text-slate-500">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge label={u.role} variant={u.role} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        label={u.isActive ? 'Active' : 'Disabled'}
                        variant={u.isActive ? 'active' : 'inactive'}
                      />
                    </td>
                    <td className="py-3 px-4">
                      {u.role === 'Admin' ? (
                        <span className="text-blue-900 font-medium">All Software (Admin)</span>
                      ) : (u.assignedSoftware || []).length === 0 ? (
                        <span className="text-slate-400">None assigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.assignedSoftware.map((sw) => (
                            <span
                              key={sw._id || sw}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[11px]"
                            >
                              {sw.name || sw.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEditUserForm(u)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold"
                        >
                          Edit / Permissions
                        </button>
                        {u._id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {userFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingUserId ? `Edit User: ${userForm.fullName}` : 'Add New User'}
              </h3>
              <button
                onClick={() => setUserFormOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {editingUserId ? 'New Password (optional)' : 'Password'}
                  </label>
                  <input
                    type="password"
                    required={!editingUserId}
                    minLength={6}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Role</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                    >
                      <option value="User">User</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-1.5 text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userForm.isActive}
                        onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
                        className="accent-blue-900"
                      />
                      <span>Active</span>
                    </label>
                  </div>
                </div>
              </div>

              {userForm.role === 'User' && (
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      Assign Software Access ({userForm.assignedSoftware.length}/
                      {softwareList.length})
                    </span>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setUserForm({
                            ...userForm,
                            assignedSoftware: softwareList.map((s) => s._id),
                          })
                        }
                        className="text-blue-900 font-semibold hover:underline"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserForm({ ...userForm, assignedSoftware: [] })}
                        className="text-slate-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {softwareList.length === 0 ? (
                    <p className="text-slate-500">
                      No software added yet. Add software in the Add Software page first.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {softwareList.map((sw) => {
                        const checked = userForm.assignedSoftware.includes(sw._id);
                        return (
                          <label
                            key={sw._id}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                              checked
                                ? 'bg-blue-50 border-blue-300 text-blue-950'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleUserSoftware(sw._id)}
                              className="accent-blue-900"
                            />
                            <span className="font-medium truncate">{sw.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setUserFormOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold"
                >
                  {savingUser ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
