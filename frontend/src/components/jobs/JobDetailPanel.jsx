import { useState, useEffect } from 'react';
import {
  X, Loader2, MapPin, Phone, Mail, Calendar, DollarSign,
  User, Clock, ChevronRight, ArrowRight, Users, FileText,
  CheckCircle2, AlertCircle, Edit3, Trash2, UserMinus, Save,
} from 'lucide-react';
import { useNotification } from '../Notification';
import jobService from '../../services/jobService';

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

const NEXT_ACTIONS = {
  TENTATIVE:   { nextStatus: 'CONFIRMED',   label: 'Confirm Job',       allowedRoles: ['ADMIN'] },
  CONFIRMED:   { nextStatus: 'ASSIGNED',    label: 'Assign Technician', allowedRoles: ['ADMIN'], isAssign: true },
  ASSIGNED:    { nextStatus: 'DISPATCHED',  label: 'Dispatch to Tech',  allowedRoles: ['OFFICE_MANAGER'], requiresNotes: true },
  DISPATCHED:  { nextStatus: 'IN_PROGRESS', label: 'Start Work',        allowedRoles: ['TECHNICIAN'] },
  IN_PROGRESS: { nextStatus: 'COMPLETED',   label: 'Mark Completed',    allowedRoles: ['TECHNICIAN'] },
  COMPLETED:   { nextStatus: 'BILLED',      label: 'Mark as Billed',    allowedRoles: ['OFFICE_MANAGER'] },
};

const STATUS_FLOW = ['TENTATIVE', 'CONFIRMED', 'ASSIGNED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'BILLED'];

export default function JobDetailPanel({ job: initialJob, userRole, onClose, onStatusChanged, onAssignClick, onJobDeleted }) {
  const { showNotification } = useNotification();
  const [job, setJob] = useState(initialJob);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionNotes, setTransitionNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reassign
  const [showReassign, setShowReassign] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [reassignTechId, setReassignTechId] = useState('');
  const [reassignNotes, setReassignNotes] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [loadingTechs, setLoadingTechs] = useState(false);

  // Fetch full job detail + history on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [jobRes, historyRes] = await Promise.all([
          jobService.getJob(initialJob._id),
          jobService.getHistory(initialJob._id),
        ]);
        setJob(jobRes.data);
        setHistory(historyRes.data.history || []);
      } catch {
        showNotification('Failed to load job details', false);
      } finally {
        setLoadingHistory(false);
      }
    };
    load();
  }, [initialJob._id, showNotification]);

  // ── Edit handlers ──
  const startEditing = () => {
    setEditForm({
      title: job.title || '',
      description: job.description || '',
      customerName: job.customerName || '',
      customerPhone: job.customerPhone || '',
      customerEmail: job.customerEmail || '',
      address: job.address || '',
      scheduledDate: job.scheduledDate ? job.scheduledDate.split('T')[0] : '',
      estimatedCost: job.estimatedCost ?? '',
      notes: job.notes || '',
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const payload = { ...editForm };
      if (payload.estimatedCost !== '') payload.estimatedCost = parseFloat(payload.estimatedCost);
      else delete payload.estimatedCost;
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') delete payload[k];
      });

      const res = await jobService.updateJob(job._id, payload);
      setJob(res.data);
      setEditing(false);
      showNotification('Job updated successfully', true);
      onStatusChanged();
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to update job', false);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete handler ──
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await jobService.deleteJob(job._id);
      showNotification('Job deleted successfully', true);
      if (onJobDeleted) onJobDeleted();
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to delete job', false);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // ── Reassign handler ──
  const openReassign = async () => {
    setShowReassign(true);
    setLoadingTechs(true);
    try {
      const res = await jobService.getTechnicians();
      setTechnicians(res.data);
    } catch {
      showNotification('Failed to load technicians', false);
    } finally {
      setLoadingTechs(false);
    }
  };

  const handleReassign = async () => {
    if (!reassignTechId) {
      showNotification('Select a technician', false);
      return;
    }
    setReassigning(true);
    try {
      const res = await jobService.reassignTechnician(job._id, reassignTechId, reassignNotes || undefined);
      setJob(res.data);
      setShowReassign(false);
      setReassignTechId('');
      setReassignNotes('');
      showNotification(res.message || 'Technician reassigned', true);

      // Refresh history
      const historyRes = await jobService.getHistory(job._id);
      setHistory(historyRes.data.history || []);

      onStatusChanged();
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to reassign', false);
    } finally {
      setReassigning(false);
    }
  };

  // ── Transition handler ──
  const handleTransition = async (nextStatus) => {
    setTransitioning(true);
    try {
      const res = await jobService.transitionStatus(job._id, nextStatus, transitionNotes || undefined);
      setJob(res.data);
      showNotification(res.message || `Status updated to ${STATUS_CONFIG[nextStatus].label}`, true);
      setTransitionNotes('');
      setShowNotesInput(false);

      const historyRes = await jobService.getHistory(job._id);
      setHistory(historyRes.data.history || []);

      onStatusChanged();
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to update status', false);
    } finally {
      setTransitioning(false);
    }
  };

  const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.TENTATIVE;
  const nextAction = NEXT_ACTIONS[job.status];
  const canPerformAction = nextAction && nextAction.allowedRoles.includes(userRole);
  const currentIdx = STATUS_FLOW.indexOf(job.status);

  const isAdmin = userRole === 'ADMIN';
  const isBilled = job.status === 'BILLED';
  const canReassign = isAdmin && !isBilled && ['ASSIGNED', 'DISPATCHED', 'IN_PROGRESS'].includes(job.status) && job.assignedTechnician;
  const canEditDelete = isAdmin && !isBilled;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-lg shadow-2xl h-full overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="flex items-start justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg font-bold text-hosanna-black truncate">{job.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {sc.label}
              </span>
              {job.assignedTechnician && (
                <span className="text-xs text-hosanna-gray">
                  · {job.assignedTechnician.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Admin action buttons */}
            {canEditDelete && !editing && (
              <>
                <button
                  onClick={startEditing}
                  className="p-2 text-hosanna-gray hover:text-hosanna-red hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Edit job"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                {canReassign && (
                  <button
                    onClick={openReassign}
                    className="p-2 text-hosanna-gray hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                    title="Reassign technician"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-hosanna-gray hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Delete job"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-hosanna-gray hover:text-hosanna-black hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-5 sm:space-y-6">
          {/* ── Delete confirmation ── */}
          {showDeleteConfirm && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-medium text-red-800 mb-3">
                Are you sure you want to delete this job? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium
                             rounded-lg hover:bg-red-700 disabled:opacity-60 cursor-pointer transition-all"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium text-hosanna-black
                             rounded-lg hover:bg-gray-50 cursor-pointer transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Reassign panel ── */}
          {showReassign && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-purple-800 mb-3">Reassign Technician</h4>
              <p className="text-xs text-purple-600 mb-3">
                The job will reset to <strong>ASSIGNED</strong> status and the previous technician will lose access.
              </p>
              {loadingTechs ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                </div>
              ) : (
                <>
                  <select
                    value={reassignTechId}
                    onChange={(e) => setReassignTechId(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm bg-white
                               focus:outline-none focus:ring-2 focus:ring-purple-500/20 mb-2 cursor-pointer"
                  >
                    <option value="">Select technician...</option>
                    {technicians
                      .filter((t) => t._id !== job.assignedTechnician?._id)
                      .map((t) => (
                        <option key={t._id} value={t._id}>{t.name} ({t.email})</option>
                      ))}
                  </select>
                  <textarea
                    value={reassignNotes}
                    onChange={(e) => setReassignNotes(e.target.value)}
                    placeholder="Reassignment notes (optional)..."
                    rows={2}
                    className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm bg-white
                               resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReassign}
                      disabled={reassigning || !reassignTechId}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium
                                 rounded-lg hover:bg-purple-700 disabled:opacity-60 cursor-pointer transition-all"
                    >
                      {reassigning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reassign'}
                    </button>
                    <button
                      onClick={() => { setShowReassign(false); setReassignTechId(''); setReassignNotes(''); }}
                      className="px-4 py-2 border border-gray-300 text-sm font-medium text-hosanna-black
                                 rounded-lg hover:bg-gray-50 cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Status Pipeline ── */}
          <div>
            <h3 className="text-xs font-semibold text-hosanna-gray uppercase tracking-wider mb-3">
              Status Flow
            </h3>
            <div className="flex items-center gap-1">
              {STATUS_FLOW.map((s, i) => {
                const cfg = STATUS_CONFIG[s];
                const isDone = i <= currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div key={s} className="flex items-center gap-1 flex-1">
                    <div className={`flex-1 h-2 rounded-full transition-all ${isDone ? cfg.dot : 'bg-gray-200'} ${isCurrent ? 'ring-2 ring-offset-1 ring-gray-300' : ''}`} />
                    {i < STATUS_FLOW.length - 1 && (
                      <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="hidden sm:flex justify-between mt-1">
              {STATUS_FLOW.map((s) => (
                <span key={s} className="text-[10px] text-hosanna-gray text-center flex-1">
                  {STATUS_CONFIG[s].label}
                </span>
              ))}
            </div>
          </div>

          {/* ── Next Action Button ── */}
          {canPerformAction && !editing && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-hosanna-gray mb-2 font-medium uppercase tracking-wider">
                Next Step
              </p>

              {!nextAction.isAssign && (
                <>
                  {(showNotesInput || nextAction.requiresNotes) && (
                    <div className="mb-3">
                      <textarea
                        value={transitionNotes}
                        onChange={(e) => setTransitionNotes(e.target.value)}
                        placeholder={nextAction.requiresNotes
                          ? 'Add dispatch instructions for the technician... (required)'
                          : 'Add transition notes (optional)...'}
                        rows={2}
                        data-lpignore="true"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                                   text-hosanna-black placeholder-gray-400 resize-none
                                   focus:outline-none focus:ring-2 focus:ring-hosanna-red/20 focus:border-hosanna-red-light
                                   transition-all duration-200"
                      />
                      {nextAction.requiresNotes && (
                        <p className="text-xs text-hosanna-gray mt-1">* Notes are required to dispatch</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (nextAction.requiresNotes && !transitionNotes.trim()) {
                          showNotification('Please add notes before dispatching', false);
                          return;
                        }
                        handleTransition(nextAction.nextStatus);
                      }}
                      disabled={transitioning}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5
                                 bg-hosanna-red text-white font-semibold rounded-lg
                                 hover:bg-hosanna-red-dark active:scale-[0.98]
                                 disabled:opacity-60 disabled:cursor-not-allowed
                                 transition-all duration-200 cursor-pointer"
                    >
                      {transitioning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          {nextAction.label}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    {!nextAction.requiresNotes && (
                      <button
                        onClick={() => setShowNotesInput(!showNotesInput)}
                        className={`p-2.5 border rounded-lg transition-all cursor-pointer
                          ${showNotesInput
                            ? 'border-hosanna-red text-hosanna-red bg-red-50'
                            : 'border-gray-300 text-hosanna-gray hover:text-hosanna-black hover:border-gray-400'
                          }`}
                        title="Add notes"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </>
              )}

              {nextAction.isAssign && (
                <button
                  onClick={() => onAssignClick(job)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                             bg-purple-600 text-white font-semibold rounded-lg
                             hover:bg-purple-700 active:scale-[0.98]
                             transition-all duration-200 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  Assign Technician
                </button>
              )}
            </div>
          )}

          {/* ── Edit Form ── */}
          {editing && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-semibold text-hosanna-red-dark mb-1">Edit Job Details</h4>
              <EditField label="Title" name="title" value={editForm.title} onChange={(v) => setEditForm({ ...editForm, title: v })} />
              <EditField label="Description" name="description" value={editForm.description} onChange={(v) => setEditForm({ ...editForm, description: v })} textarea />
              <EditField label="Customer Name" name="customerName" value={editForm.customerName} onChange={(v) => setEditForm({ ...editForm, customerName: v })} />
              <EditField label="Phone" name="customerPhone" value={editForm.customerPhone} onChange={(v) => setEditForm({ ...editForm, customerPhone: v.replace(/[a-zA-Z]/g, '') })} />
              <EditField label="Email" name="customerEmail" value={editForm.customerEmail} onChange={(v) => setEditForm({ ...editForm, customerEmail: v })} />
              <EditField label="Address" name="address" value={editForm.address} onChange={(v) => setEditForm({ ...editForm, address: v })} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-hosanna-red-dark mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    value={editForm.scheduledDate}
                    min={today}
                    onChange={(e) => setEditForm({ ...editForm, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm bg-white
                               focus:outline-none focus:ring-2 focus:ring-hosanna-red/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-hosanna-red-dark mb-1">Est. Cost ($)</label>
                  <input
                    type="number"
                    value={editForm.estimatedCost}
                    min="0"
                    step="0.01"
                    onChange={(e) => setEditForm({ ...editForm, estimatedCost: e.target.value })}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm bg-white
                               focus:outline-none focus:ring-2 focus:ring-hosanna-red/20"
                  />
                </div>
              </div>
              <EditField label="Notes" name="notes" value={editForm.notes} onChange={(v) => setEditForm({ ...editForm, notes: v })} textarea />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-hosanna-red text-white text-sm font-medium
                             rounded-lg hover:bg-hosanna-red-dark disabled:opacity-60 cursor-pointer transition-all"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium text-hosanna-black
                             rounded-lg hover:bg-gray-50 cursor-pointer transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Customer Info ── */}
          {!editing && (
            <>
              <div>
                <h3 className="text-xs font-semibold text-hosanna-gray uppercase tracking-wider mb-3">
                  Customer
                </h3>
                <div className="space-y-2.5">
                  <InfoRow icon={User} label="Name" value={job.customerName} />
                  {job.customerPhone && <InfoRow icon={Phone} label="Phone" value={job.customerPhone} />}
                  {job.customerEmail && <InfoRow icon={Mail} label="Email" value={job.customerEmail} />}
                  {job.address && <InfoRow icon={MapPin} label="Address" value={typeof job.address === 'string' ? job.address : `${job.address.street || ''} ${job.address.city || ''}`} />}
                </div>
              </div>

              {/* ── Job Details ── */}
              <div>
                <h3 className="text-xs font-semibold text-hosanna-gray uppercase tracking-wider mb-3">
                  Details
                </h3>
                <div className="space-y-2.5">
                  {job.description && (
                    <div className="text-sm text-hosanna-black bg-gray-50 rounded-lg p-3">
                      {job.description}
                    </div>
                  )}
                  {job.scheduledDate && (
                    <InfoRow
                      icon={Calendar}
                      label="Scheduled"
                      value={new Date(job.scheduledDate).toLocaleDateString('en-US', {
                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    />
                  )}
                  {job.estimatedCost != null && (
                    <InfoRow icon={DollarSign} label="Estimated Cost" value={`$${job.estimatedCost.toLocaleString()}`} />
                  )}
                  {job.actualCost != null && (
                    <InfoRow icon={DollarSign} label="Actual Cost" value={`$${job.actualCost.toLocaleString()}`} />
                  )}
                  {job.assignedTechnician && (
                    <InfoRow icon={Users} label="Technician" value={`${job.assignedTechnician.name} (${job.assignedTechnician.email})`} />
                  )}
                  {job.createdBy && (
                    <InfoRow icon={User} label="Created By" value={job.createdBy.name} />
                  )}
                  {job.notes && (
                    <div>
                      <p className="text-xs text-hosanna-gray mb-1">Notes</p>
                      <p className="text-sm text-hosanna-black bg-gray-50 rounded-lg p-3">{job.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Status History ── */}
          <div>
            <h3 className="text-xs font-semibold text-hosanna-gray uppercase tracking-wider mb-3">
              Status History
            </h3>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-hosanna-red animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-hosanna-gray italic">No history yet</p>
            ) : (
              <div className="space-y-0">
                {history.map((entry, i) => {
                  const toConfig = STATUS_CONFIG[entry.toStatus] || STATUS_CONFIG.TENTATIVE;
                  return (
                    <div key={entry._id || i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${toConfig.dot} shrink-0 mt-1`} />
                        {i < history.length - 1 && (
                          <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                        )}
                      </div>
                      <div className="pb-4 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {entry.fromStatus && (
                            <>
                              <span className="text-xs text-hosanna-gray">
                                {STATUS_CONFIG[entry.fromStatus]?.label || entry.fromStatus}
                              </span>
                              <ArrowRight className="w-3 h-3 text-gray-300" />
                            </>
                          )}
                          <span className={`text-xs font-medium ${toConfig.text}`}>
                            {toConfig.label}
                          </span>
                        </div>
                        <p className="text-xs text-hosanna-gray mt-0.5">
                          {entry.changedBy?.name || 'System'}
                          {entry.changedAt && (
                            <> · {new Date(entry.changedAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}</>
                          )}
                        </p>
                        {entry.notes && (
                          <p className="text-xs text-hosanna-gray mt-1 italic">
                            &ldquo;{entry.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helper components ── */
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-hosanna-gray mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-hosanna-gray">{label}</p>
        <p className="text-sm text-hosanna-black">{value}</p>
      </div>
    </div>
  );
}

function EditField({ label, name, value, onChange, textarea }) {
  const cls = "w-full px-3 py-2 border border-red-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-hosanna-red/20";
  return (
    <div>
      <label className="block text-xs font-medium text-hosanna-red-dark mb-1">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className={`${cls} resize-none`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      )}
    </div>
  );
}
