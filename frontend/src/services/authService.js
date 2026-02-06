import api from './api';

const authService = {
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.success) {
      localStorage.setItem('hosanna_token', data.data.token);
      localStorage.setItem('hosanna_user', JSON.stringify(data.data.user));
    }
    return data;
  },

  async register(name, email, password, role) {
    const { data } = await api.post('/auth/register', { name, email, password, role });
    if (data.success) {
      localStorage.setItem('hosanna_token', data.data.token);
      localStorage.setItem('hosanna_user', JSON.stringify(data.data.user));
    }
    return data;
  },

  async getMe() {
    const { data } = await api.get('/auth/me');
    return data;
  },

  logout() {
    localStorage.removeItem('hosanna_token');
    localStorage.removeItem('hosanna_user');
  },

  getStoredUser() {
    const user = localStorage.getItem('hosanna_user');
    return user ? JSON.parse(user) : null;
  },

  getToken() {
    return localStorage.getItem('hosanna_token');
  },

  isAuthenticated() {
    return !!localStorage.getItem('hosanna_token');
  },
};

export default authService;
