import { useState, useEffect, useCallback, useRef } from 'react';
import { EventsResponse, RoomConfig } from '../types';
import { fetchEvents, fetchConfig } from '../services/api';

interface UseCalendarDataResult {
  data: EventsResponse | null;
  config: RoomConfig | null;
  loading: boolean;
  error: Error | null;
  isOffline: boolean;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

const DEFAULT_REFRESH_INTERVAL = 30; // seconds

export function useCalendarData(): UseCalendarDataResult {
  const [data, setData] = useState<EventsResponse | null>(null);
  const [config, setConfig] = useState<RoomConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const intervalRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch config on mount
  useEffect(() => {
    fetchConfig()
      .then((configData) => {
        if (isMountedRef.current) {
          setConfig(configData);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch config:', err);
        // Use defaults if config fetch fails
        if (isMountedRef.current) {
          setConfig({
            roomName: 'Zasedací místnost',
            timezone: 'Europe/Prague',
            refreshIntervalSeconds: DEFAULT_REFRESH_INTERVAL,
          });
        }
      });
  }, []);

  // Fetch events
  const refresh = useCallback(async () => {
    if (isOffline) {
      setError(new Error('Jste offline'));
      return;
    }

    try {
      setError(null);
      const eventsData = await fetchEvents();
      if (isMountedRef.current) {
        setData(eventsData);
        setLastUpdated(new Date());
        setLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Neznámá chyba'));
        setLoading(false);
      }
    }
  }, [isOffline]);

  // Initial fetch and polling setup
  useEffect(() => {
    isMountedRef.current = true;
    refresh();

    return () => {
      isMountedRef.current = false;
    };
  }, [refresh]);

  // Set up polling interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const intervalMs = (config?.refreshIntervalSeconds || DEFAULT_REFRESH_INTERVAL) * 1000;
    intervalRef.current = window.setInterval(() => {
      refresh();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [config?.refreshIntervalSeconds, refresh]);

  // Retry when coming back online
  useEffect(() => {
    if (!isOffline && error) {
      refresh();
    }
  }, [isOffline, error, refresh]);

  return {
    data,
    config,
    loading,
    error,
    isOffline,
    refresh,
    lastUpdated,
  };
}
