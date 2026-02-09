import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) {
      // No user - disconnect if connected
      setSocket((prev) => {
        if (prev) prev.disconnect();
        return null;
      });
      return;
    }

    const token = localStorage.getItem('hosanna_token');
    if (!token) return;

    // Connect to the backend WebSocket server
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const serverUrl = apiUrl.replace(/\/api\/?$/, '');

    const s = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    s.on('connect', () => {
      console.log('Socket connected');
    });

    s.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
