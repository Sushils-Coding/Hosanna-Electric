import { useState, useEffect, useCallback } from 'react';
import { useNotification } from '../../components/Notification';
import userService from '../../services/userService';
import {
  Users, Shield, Briefcase, Wrench,
  Loader2, Mail, CheckCircle2, XCircle,
} from 'lucide-react';

const ROLE_CONFIG = {
  ADMIN:           { label: 'Administrator',  icon: Shield,    bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
  OFFICE_MANAGER:  { label: 'Office Manager', icon: Briefcase, bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  TECHNICIAN:      { label: 'Technician',     icon: Wrench,    bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
};

export default function TeamPage() {
  const { showNotification } = useNotification();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.getTeamMembers();
      setMembers(res.data);
    } catch {
      showNotification('Failed to load team members', false);
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const filteredMembers = filterRole
    ? members.filter((m) => m.role === filterRole)
    : members;

  // Role counts
  const roleCounts = members.reduce((acc, m) => {
    acc[m.role] = (acc[m.role] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-hosanna-red animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-hosanna-black">Team</h1>
        <p className="text-xs sm:text-sm text-hosanna-gray mt-0.5">
          View and manage your team members
        </p>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
          <button
            key={role}
            onClick={() => setFilterRole(filterRole === role ? '' : role)}
            className={`bg-white rounded-xl shadow-sm border p-3 sm:p-5 text-left
                       cursor-pointer transition-all hover:shadow-md
                       ${filterRole === role
                         ? 'border-hosanna-red ring-2 ring-hosanna-red/20'
                         : 'border-gray-200'
                       }`}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs sm:text-sm text-hosanna-gray font-medium">{cfg.label}s</span>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                <cfg.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${cfg.text}`} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-hosanna-black">{roleCounts[role] || 0}</p>
            <p className="text-[10px] sm:text-xs text-hosanna-gray mt-0.5">
              {filterRole === role ? 'Click to show all' : 'Click to filter'}
            </p>
          </button>
        ))}
      </div>

      {/* Active filter indicator */}
      {filterRole && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-hosanna-gray">Showing:</span>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_CONFIG[filterRole].bg} ${ROLE_CONFIG[filterRole].text}`}>
            {ROLE_CONFIG[filterRole].label}s
          </span>
          <button
            onClick={() => setFilterRole('')}
            className="text-xs text-hosanna-red hover:text-hosanna-red-dark font-medium cursor-pointer ml-1"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Members list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid md:grid-cols-[1fr_1fr_150px_100px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200
                        text-xs font-semibold text-hosanna-gray uppercase tracking-wider">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Status</span>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-hosanna-gray">
            <Users className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-lg font-medium">No members found</p>
            <p className="text-sm mt-1">
              {filterRole ? 'Try a different filter' : 'No team members yet'}
            </p>
          </div>
        ) : (
          filteredMembers.map((member) => {
            const rc = ROLE_CONFIG[member.role] || ROLE_CONFIG.TECHNICIAN;
            return (
              <div
                key={member._id}
                className="grid grid-cols-1 md:grid-cols-[1fr_1fr_150px_100px] gap-2 md:gap-4
                           px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 last:border-b-0
                           hover:bg-gray-50 transition-colors"
              >
                {/* Name + avatar */}
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${rc.bg} flex items-center justify-center shrink-0`}>
                    <span className={`text-sm font-bold ${rc.text}`}>
                      {member.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-hosanna-black text-sm">{member.name}</p>
                    <p className="text-xs text-hosanna-gray md:hidden">{member.email}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="hidden md:flex items-center gap-2">
                  <Mail className="w-4 h-4 text-hosanna-gray shrink-0" />
                  <p className="text-sm text-hosanna-black truncate">{member.email}</p>
                </div>

                {/* Role badge */}
                <div className="flex items-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${rc.bg} ${rc.text}`}>
                    <rc.icon className="w-3 h-3" />
                    {rc.label}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center">
                  {member.isActive ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                      <XCircle className="w-3.5 h-3.5" />
                      Inactive
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Total count */}
      <div className="mt-4">
        <p className="text-sm text-hosanna-gray">
          {filteredMembers.length} of {members.length} total member{members.length !== 1 ? 's' : ''}
        </p>
      </div>
    </>
  );
}
