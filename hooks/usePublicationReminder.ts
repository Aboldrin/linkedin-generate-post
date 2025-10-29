import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'linkedinPostGeneratorLastPublished';
const PERMISSION_DISMISSED_KEY = 'linkedinPostGeneratorPermissionDismissed';
const REMINDER_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

type NotificationPermission = 'default' | 'granted' | 'denied';

interface UsePublicationReminderProps {
  proactiveDraftsReady: boolean;
}

interface UsePublicationReminderReturn {
  permission: NotificationPermission;
  requestPermission: () => Promise<void>;
  resetTimer: () => void;
  shouldAskPermission: boolean;
  dismissPermissionRequest: () => void;
}

export const usePublicationReminder = ({ proactiveDraftsReady }: UsePublicationReminderProps): UsePublicationReminderReturn => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [shouldAskPermission, setShouldAskPermission] = useState(false);

  useEffect(() => {
    // Check if Notification API is available
    if ('Notification' in window) {
      setPermission(Notification.permission);
      const permissionDismissed = localStorage.getItem(PERMISSION_DISMISSED_KEY);
      if (Notification.permission === 'default' && !permissionDismissed) {
        setShouldAskPermission(true);
      }
    }
  }, []);
  
  useEffect(() => {
    if (permission === 'granted') {
      const lastPublishedStr = localStorage.getItem(STORAGE_KEY);
      if (lastPublishedStr) {
        const lastPublished = parseInt(lastPublishedStr, 10);
        if (Date.now() - lastPublished > REMINDER_INTERVAL_MS) {
          const title = proactiveDraftsReady 
            ? 'I tuoi post sono pronti!' 
            : 'È ora di brillare su LinkedIn!';
          const body = proactiveDraftsReady
            ? 'Ho generato delle bozze per te. Dagli un\'occhiata e scegli la migliore!'
            : 'Sono passati 3 giorni. Genera un nuovo post per mantenere attivo il tuo profilo!';

          new Notification(title, {
            body: body,
            icon: '/vite.svg',
          }).onclick = () => {
             window.focus();
          };
          // Reset timer after showing notification
          localStorage.setItem(STORAGE_KEY, Date.now().toString());
        }
      } else {
         // If timer is not set, set it now to start the countdown.
         localStorage.setItem(STORAGE_KEY, Date.now().toString());
      }
    }
  }, [permission, proactiveDraftsReady]);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const status = await Notification.requestPermission();
      setPermission(status);
      setShouldAskPermission(false);
       if (status === 'granted') {
          // Set the timer for the first time when permission is granted
          localStorage.setItem(STORAGE_KEY, Date.now().toString());
      }
    }
  }, []);
  
  const dismissPermissionRequest = useCallback(() => {
      localStorage.setItem(PERMISSION_DISMISSED_KEY, 'true');
      setShouldAskPermission(false);
  }, []);

  const resetTimer = useCallback(() => {
    if (permission === 'granted') {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }
  }, [permission]);

  return { permission, requestPermission, resetTimer, shouldAskPermission, dismissPermissionRequest };
};