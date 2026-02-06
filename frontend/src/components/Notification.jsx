import { createContext, useContext, useCallback, useState, useRef } from 'react';

const NotificationContext = createContext(null);

/**
 * Notification component based on the Hosanna notification system.
 * Themed to match the Hosanna Electric brand (red/black).
 * Success = green tones, Error = brand red tones.
 */
export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState({ message: '', status: true, visible: false });
  const timerRef = useRef(null);

  const showNotification = useCallback((message, status = true, delay = 2500) => {
    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setNotification({ message, status, visible: true });

    if (delay) {
      timerRef.current = setTimeout(() => {
        setNotification((prev) => ({ ...prev, visible: false }));
      }, delay);
    }
  }, []);

  const hideNotification = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setNotification((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      <Notification {...notification} />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}

/* ── The actual notification UI ── */
function Notification({ message, status, visible }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={`
        fixed top-[5%] left-1/2 -translate-x-1/2 z-50
        flex items-center gap-3 px-5 py-3.5
        rounded-xl shadow-lg
        font-medium text-sm leading-tight
        transition-all duration-200 ease-in-out
        ${visible
          ? 'opacity-100 scale-100 translate-y-0'
          : 'opacity-0 scale-[0.85] -translate-y-3 pointer-events-none'}
        ${status
          ? 'bg-[#edf7ed] text-[#295D31]'
          : 'bg-[#faecea] text-[#C41E2A]'}
      `}
      style={{ boxShadow: '0 0 4px 1px rgba(0,0,0,0.15)' }}
    >
      {/* Icon */}
      {status ? <SuccessIcon /> : <ErrorIcon />}

      {/* Message */}
      <p className="whitespace-nowrap">{message}</p>
    </div>
  );
}

function SuccessIcon() {
  return (
    <div className="flex items-center justify-center w-[23px] h-[23px] shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 23 23" fill="none">
        <path d="M7 12.4286L9.7 15L16 9" stroke="#295D31" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11.5 22C17.299 22 22 17.299 22 11.5C22 5.70101 17.299 1 11.5 1C5.70101 1 1 5.70101 1 11.5C1 17.299 5.70101 22 11.5 22Z" stroke="#295D31" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ErrorIcon() {
  return (
    <div className="flex items-center justify-center w-[23px] h-[23px] shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 23 23" fill="none">
        <path d="M15 8L8 15" stroke="#C41E2A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 8L15 15" stroke="#C41E2A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11.5 22C17.299 22 22 17.299 22 11.5C22 5.70101 17.299 1 11.5 1C5.70101 1 1 5.70101 1 11.5C1 17.299 5.70101 22 11.5 22Z" stroke="#C41E2A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
