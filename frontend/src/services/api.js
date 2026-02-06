import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hosanna_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — redirect to login (skip auth endpoints so login/register
// errors are surfaced as notifications instead of triggering a full page reload)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register');

    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('hosanna_token');
      localStorage.removeItem('hosanna_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
