import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNotification } from '../../components/Notification';
import jobService from '../../services/jobService';
import JobDetailPanel from '../../components/jobs/JobDetailPanel';
import AssignTechModal from '../../components/jobs/AssignTechModal';
import {
  Briefcase, CheckCircle2, AlertCircle,
  Loader2, ChevronRight, ArrowRight, Calendar, X,
} from 'lucide-react';

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

export default function DashboardPage() {
  const { user } = useAuth();
  const socket = useSocket();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Action filter: 'needs-action' | 'overdue' | null
  const [actionFilter, setActionFilter] = useState(null);

  // Job detail panel
  const [selectedJob, setSelectedJob] = useState(null);
  const [assignJob, setAssignJob] = useState(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobService.getJobs({ page: 1, limit: 100 });
      setJobs(res.data);
    } catch {
      showNotification('Failed to load jobs', false);
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Silent background refresh (no loading spinner)
  const silentRefresh = useCallback(async () => {
    try {
      const res = await jobService.getJobs({ page: 1, limit: 100 });
      setJobs(res.data);
    } catch { /* silent */ }
  }, []);

  // Listen for real-time job updates
  useEffect(() => {
    if (!socket) return;
    const handler = () => silentRefresh();
    socket.on('jobs:updated', handler);
    return () => socket.off('jobs:updated', handler);
  }, [socket, silentRefresh]);

  // Refresh selected job after status change
  const handleStatusChanged = () => {
    fetchJobs();
    if (selectedJob) refreshSelectedJob(selectedJob._id);
  };

  const handleJobDeleted = () => {
    setSelectedJob(null);
    fetchJobs();
  };

  const handleAssigned = () => {
    setAssignJob(null);
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

  // Stats
  const statCounts = jobs.reduce((acc, j) => {
    acc[j.status] = (acc[j.status] || 0) + 1;
    return acc;
  }, {});

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysJobs = jobs.filter(
    (j) => j.scheduledDate && j.scheduledDate.startsWith(todayStr)
  );
  const activeJobs = jobs.filter(
    (j) => ['DISPATCHED', 'IN_PROGRESS'].includes(j.status)
  );

  const statCards = [
    { label: "Today's Jobs", value: todaysJobs.length, sub: 'Scheduled for today', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Jobs', value: activeJobs.length, sub: 'Currently in progress', icon: Briefcase, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Pending', value: (statCounts.TENTATIVE || 0) + (statCounts.CONFIRMED || 0) + (statCounts.ASSIGNED || 0), sub: 'Awaiting action', icon: AlertCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Completed', value: (statCounts.COMPLETED || 0) + (statCounts.BILLED || 0), sub: 'Finished jobs', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  // Jobs sorted by most recent first (createdAt descending — already from backend)
  const recentJobs = [...jobs].slice(0, 5);

  // Compute action items
  const needsAction = jobs.filter((j) =>
    (user?.role === 'ADMIN' && ['TENTATIVE', 'CONFIRMED'].includes(j.status)) ||
    (user?.role === 'OFFICE_MANAGER' && ['ASSIGNED', 'COMPLETED'].includes(j.status)) ||
    (user?.role === 'TECHNICIAN' && ['DISPATCHED'].includes(j.status))
  );

  const overdue = jobs.filter((j) => {
    if (!j.scheduledDate || ['COMPLETED', 'BILLED'].includes(j.status)) return false;
    return new Date(j.scheduledDate) < new Date(todayStr);
  });

  const actionItems = [];
  if (needsAction.length > 0) {
    actionItems.push({ label: `${needsAction.length} jobs need your attention`, type: 'warning', filter: 'needs-action' });
  }
  if (overdue.length > 0) {
    actionItems.push({ label: `${overdue.length} overdue jobs`, type: 'error', filter: 'overdue' });
  }

  // Filtered jobs for the action list below
  const filteredActionJobs = actionFilter === 'needs-action'
    ? needsAction
    : actionFilter === 'overdue'
      ? overdue
      : [];

  const filterLabel = actionFilter === 'needs-action'
    ? 'Jobs Needing Your Attention'
    : actionFilter === 'overdue'
      ? 'Overdue Jobs'
      : '';

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
        <h1 className="text-xl sm:text-2xl font-bold text-hosanna-black">Dashboard</h1>
        <p className="text-xs sm:text-sm text-hosanna-gray mt-0.5">
          Welcome back! Here's an overview of your field operations.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs sm:text-sm text-hosanna-gray font-medium">{s.label}</span>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${s.color}`} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-hosanna-black">{s.value}</p>
            <p className="text-[10px] sm:text-xs text-hosanna-gray mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Action required */}
      {actionItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-5 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-bold text-hosanna-black mb-1">Action Required</h2>
          <p className="text-xs sm:text-sm text-hosanna-gray mb-3">Click to view the jobs that need your attention</p>
          <div className="flex flex-wrap gap-2">
            {actionItems.map((item, i) => (
              <button
                key={i}
                onClick={() => setActionFilter(actionFilter === item.filter ? null : item.filter)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                  cursor-pointer transition-all
                  ${actionFilter === item.filter
                    ? 'ring-2 ring-offset-1 ' + (item.type === 'error' ? 'ring-red-400 bg-red-100 text-red-800' : 'ring-amber-400 bg-amber-100 text-amber-800')
                    : item.type === 'error'
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
              >
                <AlertCircle className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtered action jobs list */}
      {actionFilter && filteredActionJobs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4 sm:mb-6">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-hosanna-black">{filterLabel}</h2>
              <p className="text-xs sm:text-sm text-hosanna-gray">{filteredActionJobs.length} job{filteredActionJobs.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => setActionFilter(null)}
              className="p-2 rounded-lg text-hosanna-gray hover:bg-gray-100 hover:text-hosanna-black
                         transition-all cursor-pointer"
              title="Close filter"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {filteredActionJobs.map((job) => {
            const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.TENTATIVE;
            return (
              <div
                key={job._id}
                onClick={() => setSelectedJob(job)}
                className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-gray-50 last:border-b-0
                           hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className={`w-2 h-2 rounded-full ${sc.dot} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-hosanna-black truncate">{job.title}</p>
                  <p className="text-[10px] sm:text-xs text-hosanna-gray truncate">{job.customerName}</p>
                </div>
                {job.scheduledDate && (
                  <span className="text-xs text-hosanna-gray hidden sm:block">
                    {new Date(job.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
                <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${sc.bg} ${sc.text}`}>
                  {sc.label}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 hidden sm:block" />
              </div>
            );
          })}
        </div>
      )}

      {/* Recent jobs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-hosanna-black">Recent Jobs</h2>
            <p className="text-xs sm:text-sm text-hosanna-gray">Latest job assignments and updates</p>
          </div>
          <button
            onClick={() => navigate('/jobs')}
            className="flex items-center gap-1 text-sm text-hosanna-red hover:text-hosanna-red-dark font-medium
                       cursor-pointer transition-colors"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {recentJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-hosanna-gray">
            <Briefcase className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">No jobs yet</p>
          </div>
        ) : (
          recentJobs.map((job) => {
            const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.TENTATIVE;
            return (
              <div
                key={job._id}
                onClick={() => setSelectedJob(job)}
                className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-gray-50 last:border-b-0
                           hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className={`w-2 h-2 rounded-full ${sc.dot} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-hosanna-black truncate">{job.title}</p>
                  <p className="text-[10px] sm:text-xs text-hosanna-gray truncate">{job.customerName}</p>
                </div>
                <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${sc.bg} ${sc.text}`}>
                  {sc.label}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 hidden sm:block" />
              </div>
            );
          })
        )}
      </div>

      {/* ═══ Modals ═══ */}
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
