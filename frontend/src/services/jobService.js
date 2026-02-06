import api from './api';

const jobService = {
  /** Fetch paginated jobs list with optional filters */
  async getJobs({ status, assignedTechnician, page = 1, limit = 20 } = {}) {
    const params = { page, limit };
    if (status) params.status = status;
    if (assignedTechnician) params.assignedTechnician = assignedTechnician;
    const { data } = await api.get('/jobs', { params });
    return data;
  },

  /** Get single job detail */
  async getJob(id) {
    const { data } = await api.get(`/jobs/${id}`);
    return data;
  },

  /** Create a new job (ADMIN only) */
  async createJob(jobData) {
    const { data } = await api.post('/jobs', jobData);
    return data;
  },

  /** Transition job status */
  async transitionStatus(id, status, notes) {
    const { data } = await api.patch(`/jobs/${id}/status`, { status, notes });
    return data;
  },

  /** Assign technician to a job (ADMIN only) */
  async assignTechnician(id, technicianId, notes) {
    const { data } = await api.patch(`/jobs/${id}/assign`, { technicianId, notes });
    return data;
  },

  /** Update job details (ADMIN, OFFICE_MANAGER) */
  async updateJob(id, jobData) {
    const { data } = await api.put(`/jobs/${id}`, jobData);
    return data;
  },

  /** Delete a job (ADMIN only) */
  async deleteJob(id) {
    const { data } = await api.delete(`/jobs/${id}`);
    return data;
  },

  /** Reassign technician (ADMIN only) — resets job to ASSIGNED */
  async reassignTechnician(id, technicianId, notes) {
    const { data } = await api.patch(`/jobs/${id}/reassign`, { technicianId, notes });
    return data;
  },

  /** Get job status history */
  async getHistory(id) {
    const { data } = await api.get(`/jobs/${id}/history`);
    return data;
  },

  /** Get all technicians (for assignment dropdown) */
  async getTechnicians() {
    const { data } = await api.get('/users/technicians');
    return data;
  },
};

export default jobService;
