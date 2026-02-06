import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, Users,
  LogOut, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABEL = {
  ADMIN: 'Administrator',
  OFFICE_MANAGER: 'Office Manager',
  TECHNICIAN: 'Technician',
};

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/jobs', icon: Briefcase, label: 'Jobs' },
    ],
  },
  {
    label: 'Administration',
    roles: ['ADMIN'],
    items: [
      { to: '/team', icon: Users, label: 'Team' },
    ],
  },
];

export default function Sidebar({ collapsed, mobileOpen, onMobileClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  // On mobile: always show expanded (not collapsed), slide in/out
  // On desktop: fixed sidebar with collapse support
  const showLabels = mobileOpen || !collapsed;

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 z-50
                  flex flex-col transition-all duration-300 ease-in-out
                  ${mobileOpen
                    ? 'translate-x-0 w-[250px]'
                    : '-translate-x-full w-[250px]'}
                  md:translate-x-0
                  ${collapsed ? 'md:w-[72px]' : 'md:w-[250px]'}`}
    >
      {/* ── Brand ── */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-200 shrink-0">
        <img
          src="/Hosanna-logo.webp"
          alt="Hosanna Electric"
          className={`object-contain shrink-0 transition-all duration-300 ${collapsed && !mobileOpen ? 'md:h-9 md:w-9 h-10' : 'h-10'}`}
        />
        {showLabels && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-hosanna-black truncate">Hosanna Electric</p>
            <p className="text-[11px] text-hosanna-gray truncate">Field Service</p>
          </div>
        )}
        {/* Mobile close button */}
        {mobileOpen && (
          <button
            onClick={onMobileClose}
            className="p-2 rounded-lg text-hosanna-gray hover:bg-gray-100 hover:text-hosanna-black
                       transition-all cursor-pointer md:hidden shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {NAV_SECTIONS.map((section) => {
          // Skip sections that require specific roles
          if (section.roles && !section.roles.includes(user?.role)) return null;

          return (
            <div key={section.label}>
              {showLabels && (
                <p className="text-[11px] font-semibold text-hosanna-gray uppercase tracking-wider px-3 mb-2">
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    location.pathname === item.to ||
                    (item.to !== '/dashboard' && location.pathname.startsWith(item.to));

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                                  transition-all duration-150 group
                                  ${isActive
                                    ? 'bg-red-50 text-hosanna-red'
                                    : 'text-hosanna-gray hover:bg-gray-100 hover:text-hosanna-black'
                                  }
                                  ${!showLabels ? 'justify-center' : ''}`}
                      title={!showLabels ? item.label : undefined}
                    >
                      <item.icon
                        className={`w-5 h-5 shrink-0 ${isActive ? 'text-hosanna-red' : 'text-hosanna-gray group-hover:text-hosanna-black'}`}
                      />
                      {showLabels && <span>{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── User card + Logout ── */}
      <div className="border-t border-gray-200 p-3 shrink-0">
        {/* User info + Logout */}
        <div className={`flex items-center gap-3 ${!showLabels ? 'flex-col' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-hosanna-red flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          {showLabels && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-hosanna-black truncate">{user?.name}</p>
              <p className="text-[11px] text-hosanna-gray truncate">{ROLE_LABEL[user?.role] || user?.role}</p>
            </div>
          )}
          <button
            onClick={logout}
            className={`p-2 rounded-lg text-hosanna-gray hover:text-hosanna-red hover:bg-red-50
                       transition-all cursor-pointer shrink-0 ${!showLabels ? 'mt-2' : ''}`}
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
