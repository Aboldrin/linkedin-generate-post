import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string | undefined;
  type: 'success' | 'error' | undefined;
  onClose: () => void;
}

const SuccessIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ErrorIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message && type) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [message, type]);

  if (!isVisible) {
    return null;
  }

  const baseClasses = "fixed top-5 right-5 w-full max-w-sm p-4 rounded-xl shadow-2xl border flex items-start gap-4 z-[100] transition-all duration-300";
  const typeClasses = {
    success: "bg-green-50 border-green-200 dark:bg-green-900/50 dark:border-green-800",
    error: "bg-red-50 border-red-200 dark:bg-red-900/50 dark:border-red-800",
  };
  const textClasses = {
    success: "text-green-800 dark:text-green-200",
    error: "text-red-800 dark:text-red-200",
  };
  const iconClasses = {
    success: "text-green-500",
    error: "text-red-500",
  };

  const Icon = type === 'success' ? SuccessIcon : ErrorIcon;

  return (
    <div className={`${baseClasses} ${type && typeClasses[type]}`}>
      <div className="flex-shrink-0">
        <Icon className={`w-6 h-6 ${type && iconClasses[type]}`} />
      </div>
      <div className="flex-grow">
        <p className={`font-semibold ${type && textClasses[type]}`}>
          {type === 'success' ? 'Successo' : 'Errore'}
        </p>
        <p className={`text-sm ${type && textClasses[type]}`}>{message}</p>
      </div>
      <button onClick={onClose} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
