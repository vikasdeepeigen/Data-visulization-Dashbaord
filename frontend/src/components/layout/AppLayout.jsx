import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  PlusSquare,
  PlusCircle,
  FileSpreadsheet,
  FileBarChart2,
  Cpu,
  Users,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Database,
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

export default function AppLayout() {
  const { user, accessibleSoftware, logout } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [softwareListOpen, setSoftwareListOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-800 text-white'
        : 'text-slate-300 hover:text-white hover:bg-slate-800'
    }`;



  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0f172a] text-slate-100 border-r border-slate-800">
      {/* Brand */}
      <div className="px-4 h-16 border-b border-slate-800 flex items-center justify-between">
        <div
          onClick={() => {
            navigate(isAdmin ? '/dashboard' : '/');
            setMobileMenuOpen(false);
          }}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-800 flex items-center justify-center text-white font-bold text-sm">
            SR
          </div>
          <div>
            <div className="text-sm font-semibold text-white leading-tight">
              Data Visualization Dashboard
            </div>
            <div className="text-[11px] text-slate-400">Swaayatt Robots</div>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden text-slate-400 hover:text-white p-1"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Admin-Only Menu & Management Links */}
        {isAdmin && (
          <>
            <div className="space-y-1">
              <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Menu
              </div>

              <NavLink
                to="/dashboard"
                className={navLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Summary Dashboard</span>
              </NavLink>

              <NavLink
                to="/data-entry"
                className={navLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                <PlusSquare className="w-4 h-4 shrink-0" />
                <span>Data Entry</span>
              </NavLink>

              <NavLink
                to="/excel"
                className={navLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>Excel &amp; Classes</span>
              </NavLink>

              <NavLink
                to="/reports"
                className={navLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                <FileBarChart2 className="w-4 h-4 shrink-0" />
                <span>Reports</span>
              </NavLink>
            </div>

            <div className="space-y-1">
              <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Admin
              </div>

              <NavLink
                to="/software-list"
                className={navLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Cpu className="w-4 h-4 shrink-0" />
                <span>Software List</span>
              </NavLink>

              <NavLink
                to="/add-software"
                className={navLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>Add Software</span>
              </NavLink>

              <NavLink
                to="/users"
                className={navLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Users &amp; Permissions</span>
              </NavLink>
            </div>
          </>
        )}

        {/* Assigned Software Section (Visible to Both Admin and User) */}
        <div>
          

          {softwareListOpen && (
            <div className="space-y-1">
              {accessibleSoftware.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400">
                  {isAdmin ? 'No software added yet.' : 'No software assigned yet.'}
                </div>
              ) : (
                accessibleSoftware.map((sw, idx) => {
                  const isSelected = location.pathname === `/software/${sw._id}`;
                  return (
                    <NavLink
                      key={sw._id}
                      to={`/software/${sw._id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 mb-4 rounded-lg text-xs transition-colors ${
                        isSelected
                          ? 'bg-blue-800 text-white font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-white text-blue-900'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="truncate text-lg ">{sw.name}</span>
                    </NavLink>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">{user?.fullName}</div>
            <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-200 border border-slate-700">
            {user?.role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex  cursor-pointer items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <aside className="hidden lg:block w-92 shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[85vw] h-full z-10">
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Database className="w-4 h-4 text-blue-900 hidden sm:inline" />
              <span className="font-semibold text-slate-900">
                Data Visualization Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge label={user?.role} variant={user?.role} />
           
          </div>
        </header>

        <main className="flex-1 px-4 pt-4 pb-12 sm:px-6 sm:pt-6 sm:pb-14 lg:px-8 lg:pt-6 lg:pb-16 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
