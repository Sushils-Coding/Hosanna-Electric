import { useState, useEffect } from 'react';
import { X, Loader2, Users, UserCheck } from 'lucide-react';
import { useNotification } from '../Notification';
import jobService from '../../services/jobService';

export default function AssignTechModal({ job, onClose, onAssigned }) {
  const { showNotification } = useNotification();
  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingTechs, setFetchingTechs] = useState(true);

  // Fetch technicians on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await jobService.getTechnicians();
        setTechnicians(res.data);
      } catch {
        showNotification('Failed to load technicians', false);
      } finally {
        setFetchingTechs(false);
      }
    };
    load();
  }, [showNotification]);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedTech) {
      showNotification('Please select a technician', false);
      return;
    }

    setLoading(true);
    try {
      await jobService.assignTechnician(job._id, selectedTech, notes || undefined);
      const tech = technicians.find((t) => t._id === selectedTech);
      showNotification(`Assigned to ${tech?.name || 'technician'}`, true);
      onAssigned();
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to assign technician', false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-hosanna-black">Assign Technician</h2>
              <p className="text-xs text-hosanna-gray truncate max-w-50">{job.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-hosanna-gray hover:text-hosanna-black hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleAssign} noValidate className="p-6 space-y-4">
          {fetchingTechs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-hosanna-red animate-spin" />
            </div>
          ) : technicians.length === 0 ? (
            <div className="text-center py-8 text-hosanna-gray">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-medium">No technicians available</p>
              <p className="text-sm mt-1">Create technician accounts first</p>
            </div>
          ) : (
            <>
              {/* Technician list */}
              <div>
                <label className="block text-sm font-medium text-hosanna-black mb-2">
                  Select Technician
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {technicians.map((tech) => (
                    <label
                      key={tech._id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all
                        ${selectedTech === tech._id
                          ? 'border-hosanna-red bg-red-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <input
                        type="radio"
                        name="technician"
                        value={tech._id}
                        checked={selectedTech === tech._id}
                        onChange={() => setSelectedTech(tech._id)}
                        className="sr-only"
                      />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${selectedTech === tech._id
                          ? 'bg-hosanna-red text-white'
                          : 'bg-gray-100 text-hosanna-gray'
                        }`}>
                        {tech.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-hosanna-black">{tech.name}</p>
                        <p className="text-xs text-hosanna-gray truncate">{tech.email}</p>
                      </div>
                      {selectedTech === tech._id && (
                        <UserCheck className="w-4 h-4 text-hosanna-red shrink-0" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-hosanna-black mb-1">
                  Assignment Notes <span className="text-hosanna-gray text-xs">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes for this assignment..."
                  rows={2}
                  data-lpignore="true"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                             text-hosanna-black placeholder-gray-400 resize-none
                             focus:outline-none focus:ring-2 focus:ring-hosanna-red/30 focus:border-hosanna-red
                             transition-all duration-200"
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium
                         text-hosanna-black hover:bg-gray-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedTech}
              className="flex items-center gap-2 px-5 py-2.5 bg-hosanna-red text-white font-semibold
                         rounded-lg hover:bg-hosanna-red-dark active:scale-[0.98]
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-all duration-200 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
