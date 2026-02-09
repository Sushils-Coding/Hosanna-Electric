import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNotification } from '../../components/Notification';
import jobService from '../../services/jobService';
import {
  Plus, Briefcase, Clock, CheckCircle2, AlertCircle,
  Search, Filter, RefreshCw, ChevronRight, Loader2,
  Calendar as CalendarIcon, List, ChevronLeft,
} from 'lucide-react';
import CreateJobModal from '../../components/jobs/CreateJobModal';
import AssignTechModal from '../../components/jobs/AssignTechModal';
import JobDetailPanel from '../../components/jobs/JobDetailPanel';

/* ── Status display config ── */
const STATUS_CONFIG = {
  TENTATIVE:   { label: 'Tentative',   bg: 'bg-gray-100',   text: 'text-gray-700',   dot: 'bg-gray-400',    color: '#9CA3AF' },
  CONFIRMED:   { label: 'Confirmed',   bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500',    color: '#3B82F6' },
  ASSIGNED:    { label: 'Assigned',    bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500',  color: '#8B5CF6' },
  DISPATCHED:  { label: 'Dispatched',  bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500',  color: '#6366F1' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500',   color: '#F59E0B' },
  COMPLETED:   { label: 'Completed',   bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500',   color: '#22C55E' },
  BILLED:      { label: 'Billed',      bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', color: '#10B981' },
};

const ALL_STATUSES = ['TENTATIVE', 'CONFIRMED', 'ASSIGNED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'BILLED'];

export default function JobsPage() {
  const { user } = useAuth();
  const socket = useSocket();
  const { showNotification } = useNotification();

  // ── State ──
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assignJob, setAssignJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  // ── Fetch jobs ──
  const fetchJobs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await jobService.getJobs({ status: statusFilter || undefined, page, limit: 100 });
      setJobs(res.data);
      setPagination(res.pagination);
    } catch {
      showNotification('Failed to load jobs', false);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showNotification]);

  // Silent background refresh
  const silentRefresh = useCallback(async () => {
    try {
      const res = await jobService.getJobs({ status: statusFilter || undefined, page: pagination.page, limit: 100 });
      setJobs(res.data);
      setPagination(res.pagination);
    } catch { /* silent */ }
  }, [statusFilter, pagination.page]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Listen for real-time job updates
  useEffect(() => {
    if (!socket) return;
    const handler = () => silentRefresh();
    socket.on('jobs:updated', handler);
    return () => socket.off('jobs:updated', handler);
  }, [socket, silentRefresh]);

  // ── Client-side search filter ──
  const filteredJobs = searchTerm
    ? jobs.filter((j) =>
        j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.customerName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : jobs;

  // ── Handlers ──
  const handleJobCreated = () => {
    setShowCreateModal(false);
    fetchJobs();
  };

  const handleAssigned = () => {
    setAssignJob(null);
    fetchJobs();
    if (selectedJob) refreshSelectedJob(selectedJob._id);
  };

  const handleStatusChanged = () => {
    fetchJobs();
    if (selectedJob) refreshSelectedJob(selectedJob._id);
  };

  const handleJobDeleted = () => {
    setSelectedJob(null);
    fetchJobs();
  };

  const refreshSelectedJob = async (id) => {
    try {
      const res = await jobService.getJob(id);
      setSelectedJob(res.data);
    } catch {
      setSelectedJob(null);
    }
  };

  // ── Calendar helpers ──
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const monthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0 = Sunday

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null); // blank cells
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  // Map jobs to calendar dates
  const jobsByDate = {};
  filteredJobs.forEach((j) => {
    if (!j.scheduledDate) return;
    const d = new Date(j.scheduledDate);
    if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
      const day = d.getDate();
      if (!jobsByDate[day]) jobsByDate[day] = [];
      jobsByDate[day].push(j);
    }
  });

  const today = new Date();
  const isToday = (day) =>
    day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();

  const prevMonth = () => setCalendarDate(new Date(calYear, calMonth - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calYear, calMonth + 1, 1));
  const goToday = () => setCalendarDate(new Date());

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-hosanna-black">Jobs</h1>
          <p className="text-sm text-hosanna-gray mt-0.5">Manage and track all field service jobs</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer
                ${viewMode === 'list' ? 'bg-white text-hosanna-black shadow-sm' : 'text-hosanna-gray hover:text-hosanna-black'}`}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer
                ${viewMode === 'calendar' ? 'bg-white text-hosanna-black shadow-sm' : 'text-hosanna-gray hover:text-hosanna-black'}`}
            >
              <CalendarIcon className="w-4 h-4" />
              Calendar
            </button>
          </div>

          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-hosanna-red text-white font-semibold
                         rounded-lg hover:bg-hosanna-red-dark active:scale-[0.98]
                         transition-all duration-200 cursor-pointer shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Job</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hosanna-gray" />
            <input
              type="text"
              placeholder="Search jobs by title or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm
                         text-hosanna-black placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-hosanna-red/20 focus:border-hosanna-red-light
                         transition-all duration-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-hosanna-gray shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-hosanna-black
                         bg-white focus:outline-none focus:ring-2 focus:ring-hosanna-red/20
                         focus:border-hosanna-red-light transition-all cursor-pointer"
            >
              <option value="">All Statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => fetchJobs()}
            className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                       text-hosanna-gray hover:text-hosanna-black hover:border-gray-400
                       transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ══════════════ LIST VIEW ══════════════ */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-hosanna-red animate-spin" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-hosanna-gray">
              <Briefcase className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">No jobs found</p>
              <p className="text-sm mt-1">
                {statusFilter ? 'Try a different filter' : 'Create your first job to get started'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table header */}
              <div className="hidden md:grid md:grid-cols-[1fr_1fr_140px_140px_120px_40px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-hosanna-gray uppercase tracking-wider">
                <span>Job Title</span>
                <span>Customer</span>
                <span>Status</span>
                <span>Technician</span>
                <span>Scheduled</span>
                <span></span>
              </div>

              {filteredJobs.map((job) => {
                const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.TENTATIVE;
                return (
                  <div
                    key={job._id}
                    onClick={() => setSelectedJob(job)}
                    className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_140px_120px_40px] gap-2 md:gap-4
                               px-6 py-4 border-b border-gray-100 last:border-b-0
                               hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${sc.dot} shrink-0 hidden md:block`} />
                      <div>
                        <p className="font-medium text-hosanna-black text-sm">{job.title}</p>
                        <p className="text-xs text-hosanna-gray md:hidden">{job.customerName}</p>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center">
                      <p className="text-sm text-hosanna-black">{job.customerName}</p>
                    </div>
                    <div className="flex items-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} md:hidden`} />
                        {sc.label}
                      </span>
                    </div>
                    <div className="hidden md:flex items-center">
                      <p className="text-sm text-hosanna-black">
                        {job.assignedTechnician?.name || (
                          <span className="text-hosanna-gray italic">Unassigned</span>
                        )}
                      </p>
                    </div>
                    <div className="hidden md:flex items-center">
                      <p className="text-sm text-hosanna-gray">
                        {job.scheduledDate
                          ? new Date(job.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—'}
                      </p>
                    </div>
                    <div className="hidden md:flex items-center justify-end">
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-hosanna-gray transition-colors" />
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ══════════════ CALENDAR VIEW ══════════════ */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Calendar header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-hosanna-gray hover:text-hosanna-black transition-all cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-hosanna-gray hover:text-hosanna-black transition-all cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-hosanna-black">{monthName}</h2>
            </div>
            <button
              onClick={goToday}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm
                         text-hosanna-gray hover:text-hosanna-black hover:border-gray-400
                         transition-all cursor-pointer"
            >
              <CalendarIcon className="w-4 h-4" />
              Today
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="px-1 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold text-hosanna-gray uppercase tracking-wider text-center">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.charAt(0)}</span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dayJobs = day ? (jobsByDate[day] || []) : [];
              const todayCell = day && isToday(day);

              return (
                <div
                  key={idx}
                  className={`min-h-[60px] sm:min-h-[120px] border-b border-r border-gray-100 p-1 sm:p-2
                    ${day ? 'bg-white' : 'bg-gray-50/50'}
                    ${todayCell ? 'bg-red-50/30' : ''}`}
                >
                  {day && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs sm:text-sm font-medium w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full
                            ${todayCell
                              ? 'bg-hosanna-red text-white'
                              : 'text-hosanna-black'
                            }`}
                        >
                          {day}
                        </span>
                      </div>
                      <div className="space-y-0.5 sm:space-y-1">
                        {dayJobs.slice(0, window.innerWidth < 640 ? 1 : 3).map((j) => {
                          const sc = STATUS_CONFIG[j.status];
                          return (
                            <button
                              key={j._id}
                              onClick={() => setSelectedJob(j)}
                              className="w-full text-left px-1 sm:px-1.5 py-0.5 sm:py-1 rounded text-[9px] sm:text-[11px] font-medium truncate
                                         cursor-pointer hover:opacity-80 transition-opacity"
                              style={{ backgroundColor: sc.color + '20', color: sc.color }}
                              title={j.title}
                            >
                              {j.title}
                            </button>
                          );
                        })}
                        {dayJobs.length > 3 && (
                          <p className="text-[10px] text-hosanna-gray font-medium px-1">
                            +{dayJobs.length - 3} more
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Pagination (list view only) ── */}
      {viewMode === 'list' && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-hosanna-gray">
            Page {pagination.page} of {pagination.pages} · {pagination.total} total jobs
          </p>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchJobs(pagination.page - 1)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-hosanna-black
                         hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              Previous
            </button>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchJobs(pagination.page + 1)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-hosanna-black
                         hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ═══ Modals ═══ */}
      {showCreateModal && (
        <CreateJobModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleJobCreated}
        />
      )}

      {assignJob && (
        <AssignTechModal
          job={assignJob}
          onClose={() => setAssignJob(null)}
          onAssigned={handleAssigned}
        />
      )}

      {selectedJob && (
        <JobDetailPanel
          job={selectedJob}
          userRole={user?.role}
          onClose={() => setSelectedJob(null)}
          onStatusChanged={handleStatusChanged}
          onAssignClick={(job) => { setSelectedJob(null); setAssignJob(job); }}
          onJobDeleted={handleJobDeleted}
        />
      )}
    </>
  );
}
