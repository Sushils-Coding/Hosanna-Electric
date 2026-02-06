import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { useNotification } from '../components/Notification';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(authService.getStoredUser());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  // Verify stored token on mount
  useEffect(() => {
    const verify = async () => {
      if (authService.isAuthenticated()) {
        try {
          const data = await authService.getMe();
          setUser(data.data);
          localStorage.setItem('hosanna_user', JSON.stringify(data.data));
        } catch {
          authService.logout();
          setUser(null);
        }
      }
      setLoading(false);
    };
    verify();
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    setUser(data.data.user);
    showNotification(`Welcome back, ${data.data.user.name}!`, true);
    navigate('/dashboard');
    return data;
  };

  const register = async (name, email, password, role) => {
    const data = await authService.register(name, email, password, role);
    setUser(data.data.user);
    showNotification('Account created successfully!', true);
    navigate('/dashboard');
    return data;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    showNotification('Logged out successfully', true);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
