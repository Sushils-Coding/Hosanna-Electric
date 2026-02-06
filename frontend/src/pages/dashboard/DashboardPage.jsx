import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../components/Notification';
import jobService from '../../services/jobService';
import {
  LogOut, User, Plus, Briefcase, Clock, CheckCircle2,
  AlertCircle, Search, Filter, RefreshCw, ChevronRight,
  Loader2,
} from 'lucide-react';
import CreateJobModal from '../../components/jobs/CreateJobModal';
import AssignTechModal from '../../components/jobs/AssignTechModal';
import JobDetailPanel from '../../components/jobs/JobDetailPanel';

/* ── Status display config ── */
const STATUS_CONFIG = {
  TENTATIVE:   { label: 'Tentative',   bg: 'bg-gray-100',   text: 'text-gray-700',   dot: 'bg-gray-400' },
  CONFIRMED:   { label: 'Confirmed',   bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  ASSIGNED:    { label: 'Assigned',    bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  DISPATCHED:  { label: 'Dispatched',  bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  COMPLETED:   { label: 'Completed',   bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  BILLED:      { label: 'Billed',      bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

const ROLE_BADGE = {
  ADMIN: 'bg-red-100 text-red-800',
  OFFICE_MANAGER: 'bg-blue-100 text-blue-800',
  TECHNICIAN: 'bg-green-100 text-green-800',
};

const ALL_STATUSES = ['TENTATIVE', 'CONFIRMED', 'ASSIGNED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'BILLED'];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { showNotification } = useNotification();

  // ── State ──
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assignJob, setAssignJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  // ── Fetch jobs ──
  const fetchJobs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await jobService.getJobs({ status: statusFilter || undefined, page });
      setJobs(res.data);
      setPagination(res.pagination);
    } catch {
      showNotification('Failed to load jobs', false);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showNotification]);

  // Silent background refresh (no loading spinner)
  const silentRefresh = useCallback(async () => {
    try {
      const res = await jobService.getJobs({ status: statusFilter || undefined, page: pagination.page });
      setJobs(res.data);
      setPagination(res.pagination);
    } catch {
      // silent — don't show error on background poll
    }
  }, [statusFilter, pagination.page]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // ── Auto-polling every 15s ──
  const pollRef = useRef(null);
  useEffect(() => {
    pollRef.current = setInterval(silentRefresh, 15000);
    return () => clearInterval(pollRef.current);
  }, [silentRefresh]);

  // ── Stats ──
  const statCounts = jobs.reduce((acc, j) => {
    acc[j.status] = (acc[j.status] || 0) + 1;
    return acc;
  }, {});

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

  const refreshSelectedJob = async (id) => {
    try {
      const res = await jobService.getJob(id);
      setSelectedJob(res.data);
    } catch {
      setSelectedJob(null);
    }
  };

  // ── Stat cards config ──
  const statCards = [
    { label: 'Total Jobs', value: pagination.total, icon: Briefcase, color: 'text-hosanna-red' },
    { label: 'In Progress', value: (statCounts.DISPATCHED || 0) + (statCounts.IN_PROGRESS || 0), icon: Clock, color: 'text-amber-500' },
    { label: 'Completed', value: statCounts.COMPLETED || 0, icon: CheckCircle2, color: 'text-green-500' },
    { label: 'Pending', value: (statCounts.TENTATIVE || 0) + (statCounts.CONFIRMED || 0) + (statCounts.ASSIGNED || 0), icon: AlertCircle, color: 'text-blue-500' },
  ];

  return (
    <div className="min-h-screen bg-hosanna-gray-light">
      {/* ═══ Header ═══ */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/Hosanna-logo.webp" alt="Hosanna Electric" className="h-10" />
              <span className="text-lg font-bold text-hosanna-black hidden sm:block">
                Hosanna Electric
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-hosanna-red flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-hosanna-black">{user?.name}</p>
                  <p className="text-xs text-hosanna-gray">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-hosanna-gray
                           hover:text-hosanna-red hover:bg-red-50 rounded-lg transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ Main ═══ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome row */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-hosanna-black">
              Welcome, {user?.name} 👋
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[user?.role] || ''}`}>
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>

          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-hosanna-red text-white font-semibold
                         rounded-lg hover:bg-hosanna-red-dark active:scale-[0.98]
                         transition-all duration-200 cursor-pointer shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Create Job</span>
            </button>
          )}
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-hosanna-gray">{s.label}</span>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-hosanna-black">{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
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
                           focus:outline-none focus:ring-2 focus:ring-hosanna-red/30 focus:border-hosanna-red
                           transition-all duration-200"
              />
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-hosanna-gray shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-hosanna-black
                           bg-white focus:outline-none focus:ring-2 focus:ring-hosanna-red/30
                           focus:border-hosanna-red transition-all cursor-pointer"
              >
                <option value="">All Statuses</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchJobs()}
              className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                         text-hosanna-gray hover:text-hosanna-black hover:border-gray-400
                         transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="sm:hidden">Refresh</span>
            </button>
          </div>
        </div>

        {/* ── Jobs List ── */}
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

              {/* Rows */}
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
                    {/* Title */}
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${sc.dot} shrink-0 hidden md:block`} />
                      <div>
                        <p className="font-medium text-hosanna-black text-sm">{job.title}</p>
                        <p className="text-xs text-hosanna-gray md:hidden">{job.customerName}</p>
                      </div>
                    </div>

                    {/* Customer */}
                    <div className="hidden md:flex items-center">
                      <p className="text-sm text-hosanna-black">{job.customerName}</p>
                    </div>

                    {/* Status */}
                    <div className="flex items-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} md:hidden`} />
                        {sc.label}
                      </span>
                    </div>

                    {/* Technician */}
                    <div className="hidden md:flex items-center">
                      <p className="text-sm text-hosanna-black">
                        {job.assignedTechnician?.name || (
                          <span className="text-hosanna-gray italic">Unassigned</span>
                        )}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="hidden md:flex items-center">
                      <p className="text-sm text-hosanna-gray">
                        {job.scheduledDate
                          ? new Date(job.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—'}
                      </p>
                    </div>

                    {/* Arrow */}
                    <div className="hidden md:flex items-center justify-end">
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-hosanna-gray transition-colors" />
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* ── Pagination ── */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-hosanna-gray">
              Page {pagination.page} of {pagination.pages} &middot; {pagination.total} total jobs
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
      </main>

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
        />
      )}
    </div>
  );
}
