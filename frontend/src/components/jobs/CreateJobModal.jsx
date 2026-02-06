import { useState } from 'react';
import { X, Loader2, Briefcase } from 'lucide-react';
import { useNotification } from '../Notification';
import jobService from '../../services/jobService';

const INITIAL = {
  title: '',
  description: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  address: '',
  scheduledDate: '',
  estimatedCost: '',
  notes: '',
};

export default function CreateJobModal({ onClose, onCreated }) {
  const { showNotification } = useNotification();
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Strip alphabets from phone — allow digits, spaces, dashes, parens, plus
    if (name === 'customerPhone') {
      const cleaned = value.replace(/[a-zA-Z]/g, '');
      setForm({ ...form, [name]: cleaned });
      return;
    }
    setForm({ ...form, [name]: value });
  };

  // Today's date in YYYY-MM-DD for min attribute
  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showNotification('Job title is required', false);
      return;
    }
    if (!form.customerName.trim()) {
      showNotification('Customer name is required', false);
      return;
    }
    if (form.customerPhone && !/^[\d\s()\-+]+$/.test(form.customerPhone)) {
      showNotification('Phone number can only contain digits, spaces, dashes, and parentheses', false);
      return;
    }
    if (form.scheduledDate && form.scheduledDate < today) {
      showNotification('Scheduled date cannot be in the past', false);
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form };
      // Clean optional numeric field
      if (payload.estimatedCost) payload.estimatedCost = parseFloat(payload.estimatedCost);
      else delete payload.estimatedCost;
      // Remove empty optional fields
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') delete payload[k];
      });

      await jobService.createJob(payload);
      showNotification('Job created successfully!', true);
      onCreated();
    } catch (err) {
      showNotification(
        err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to create job',
        false
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-hosanna-red/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-hosanna-red" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-hosanna-black">Create New Job</h2>
              <p className="text-xs text-hosanna-gray">Fill in the job details below</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-hosanna-gray hover:text-hosanna-black hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate autoComplete="off" data-lpignore="true" className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-hosanna-black mb-1">
              Job Title <span className="text-hosanna-red">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Panel Installation - Downtown"
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                         text-hosanna-black placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-hosanna-red/30 focus:border-hosanna-red
                         transition-all duration-200"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-hosanna-black mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Detailed description of the job..."
              rows={3}
              data-lpignore="true"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                         text-hosanna-black placeholder-gray-400 resize-none
                         focus:outline-none focus:ring-2 focus:ring-hosanna-red/30 focus:border-hosanna-red
                         transition-all duration-200"
            />
          </div>

          {/* Customer row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-hosanna-black mb-1">
                Customer Name <span className="text-hosanna-red">*</span>
              </label>
              <input
                type="text"
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                placeholder="John Smith"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                           text-hosanna-black placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-hosanna-red/30 focus:border-hosanna-red
                           transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-hosanna-black mb-1">Phone</label>
              <input
                type="tel"
                name="customerPhone"
                value={form.customerPhone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                           text-hosanna-black placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-hosanna-red/30 focus:border-hosanna-red
                           transition-all duration-200"
              />
            </div>
          </div>

          {/* Customer email */}
          <div>
            <label className="block text-sm font-medium text-hosanna-black mb-1">Customer Email</label>
            <input
              type="text"
              name="customerEmail"
              value={form.customerEmail}
              onChange={handleChange}
              placeholder="customer@example.com"
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                         text-hosanna-black placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-hosanna-red/30 focus:border-hosanna-red
                         transition-all duration-200"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-hosanna-black mb-1">Address</label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="123 Main St, City, State"
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                         text-hosanna-black placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-hosanna-red/30 focus:border-hosanna-red
                         transition-all duration-200"
            />
          </div>

          {/* Date + Cost row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-hosanna-black mb-1">Scheduled Date</label>
              <input
                type="date"
                name="scheduledDate"
                value={form.scheduledDate}
                onChange={handleChange}
                min={today}
                data-lpignore="true"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                           text-hosanna-black
                           focus:outline-none focus:ring-2 focus:ring-hosanna-red/30 focus:border-hosanna-red
                           transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-hosanna-black mb-1">Estimated Cost ($)</label>
              <input
                type="number"
                name="estimatedCost"
                value={form.estimatedCost}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                           text-hosanna-black placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-hosanna-red/30 focus:border-hosanna-red
                           transition-all duration-200"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-hosanna-black mb-1">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Any additional notes..."
              rows={2}
              data-lpignore="true"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                         text-hosanna-black placeholder-gray-400 resize-none
                         focus:outline-none focus:ring-2 focus:ring-hosanna-red/30 focus:border-hosanna-red
                         transition-all duration-200"
            />
          </div>

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
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-hosanna-red text-white font-semibold
                         rounded-lg hover:bg-hosanna-red-dark active:scale-[0.98]
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-all duration-200 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
