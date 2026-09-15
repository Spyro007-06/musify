import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function BackendStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [isRetrying, setIsRetrying] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      // Direct call to public health endpoint to bypass interceptors
      await axios.get('/api/health', { timeout: 3000 });
      setStatus('connected');
    } catch (error) {
      console.warn('Backend health check failed:', error);
      setStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    checkConnection();

    // Check status every 15 seconds
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    setStatus('checking');
    await checkConnection();
    // Simulate a small delay for a better feedback loop / micro-animation
    setTimeout(() => {
      setIsRetrying(false);
    }, 600);
  };

  return (
    <div className="mx-4 mb-6 p-4 rounded-2xl glass-card border border-white/5 flex flex-col gap-3 transition-all duration-300 hover:border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Pulsing indicator dot */}
          <div className="relative flex h-2.5 w-2.5">
            {status === 'connected' && (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
              </>
            )}
            {status === 'disconnected' && (
              <>
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-50"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
              </>
            )}
            {status === 'checking' && (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span>
              </>
            )}
          </div>
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
            Server Status
          </span>
        </div>

        <button
          onClick={handleRetry}
          disabled={status === 'checking' || isRetrying}
          className={`p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-foreground transition-all duration-300 disabled:opacity-50 cursor-pointer ${
            isRetrying || status === 'checking' ? 'animate-spin' : ''
          }`}
          title="Retry Connection"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {status === 'connected' && (
          <>
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-foreground">Connected</span>
          </>
        )}
        {status === 'disconnected' && (
          <>
            <WifiOff className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-semibold text-foreground">Offline</span>
          </>
        )}
        {status === 'checking' && (
          <>
            <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
            <span className="text-xs font-semibold text-foreground">Checking...</span>
          </>
        )}
      </div>
    </div>
  );
}
