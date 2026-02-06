import api from './api';

const userService = {
  /** Get all team members (ADMIN only) */
  async getTeamMembers() {
    const { data } = await api.get('/users');
    return data;
  },
};

export default userService;
