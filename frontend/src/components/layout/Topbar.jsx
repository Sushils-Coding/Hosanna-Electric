import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, PanelLeftClose, PanelLeft, Trash2, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNotification } from '../Notification';
import api from '../../services/api';

export default function Topbar({ sidebarCollapsed, onToggleSidebar, onMobileMenuToggle }) {
  const { user } = useAuth();
  const socket = useSocket();
  const { showNotification } = useNotification();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const panelRef = useRef(null);

  // Fetch unread count on mount
  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      if (data.success) setUnreadCount(data.data.count);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchUnreadCount();
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socket, fetchUnreadCount]);

  // Fetch all notifications when panel opens
  const openPanel = async () => {
    setShowPanel(true);
    setLoadingNotifs(true);
    try {
      const { data } = await api.get('/notifications');
      if (data.success) setNotifications(data.data);
    } catch {
      showNotification('Failed to load notifications', false);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      const removed = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (removed && !removed.read) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      showNotification('Failed to delete notification', false);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      await api.delete('/notifications/all');
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      showNotification('Failed to delete notifications', false);
    }
  };

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowPanel(false);
      }
    };
    if (showPanel) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPanel]);

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-gray-200 sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6">
      {/* Left — mobile hamburger + desktop collapse toggle */}
      <div className="flex items-center gap-2">
        {/* Mobile hamburger */}
        <button
          onClick={onMobileMenuToggle}
          className="p-2 rounded-lg text-hosanna-gray hover:bg-gray-100
                     hover:text-hosanna-black transition-all cursor-pointer md:hidden"
          title="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {/* Desktop collapse toggle */}
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-hosanna-gray hover:bg-gray-100
                     hover:text-hosanna-black transition-all cursor-pointer hidden md:flex"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Right — notifications only */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => (showPanel ? setShowPanel(false) : openPanel())}
            className="relative p-2 rounded-lg text-hosanna-gray hover:bg-gray-100
                       hover:text-hosanna-black transition-all cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center
                               px-1 text-[10px] font-bold text-white bg-hosanna-red rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showPanel && (
            <div className="absolute right-0 top-12 w-[calc(100vw-24px)] sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200
                            max-h-[480px] overflow-hidden flex flex-col z-50 -mr-1 sm:mr-0">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-hosanna-black">Notifications</h3>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-hosanna-red hover:text-hosanna-red-dark font-medium cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={deleteAllNotifications}
                      className="text-xs text-gray-400 hover:text-red-500 font-medium cursor-pointer flex items-center gap-1"
                      title="Delete all notifications"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1">
                {loadingNotifs ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-gray-200 border-t-hosanna-red rounded-full animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-hosanna-gray">
                    <Bell className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => !n.read && markAsRead(n._id)}
                      className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors group
                        ${n.read ? 'bg-white' : 'bg-red-50/40 hover:bg-red-50/70'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0
                          ${n.read ? 'bg-transparent' : 'bg-hosanna-red'}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${n.read ? 'text-hosanna-gray' : 'text-hosanna-black font-medium'}`}>
                            {n.message}
                          </p>
                          <p className="text-[11px] text-hosanna-gray mt-0.5">
                            {timeAgo(n.createdAt)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => deleteNotification(n._id, e)}
                          className="p-1 rounded text-gray-300 opacity-0 group-hover:opacity-100
                                     hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer shrink-0"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ── Helper: human-readable time ago ── */
function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
