import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearAuth } from '@/store/authSlice';

const WARNING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes before 15-min SUPER_ADMIN JWT expires

export function SuperAdminExpiryBanner() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, sessionExpiresAt } = useAppSelector((state) => state.auth);
  const [remainingSeconds, setRemainingSeconds] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN' || !sessionExpiresAt) {
      setRemainingSeconds(null);
      return;
    }

    const updateTimer = () => {
      const diffMs = sessionExpiresAt - Date.now();
      if (diffMs <= 0) {
        setRemainingSeconds(0);
        dispatch(clearAuth());
        navigate('/platform/login?reason=expired', { replace: true });
        return;
      }
      if (diffMs <= WARNING_THRESHOLD_MS) {
        setRemainingSeconds(Math.max(0, Math.floor(diffMs / 1000)));
      } else {
        setRemainingSeconds(null);
      }
    };

    updateTimer();
    const intervalId = window.setInterval(updateTimer, 5000);
    return () => window.clearInterval(intervalId);
  }, [user?.role, sessionExpiresAt, dispatch, navigate]);

  if (user?.role !== 'SUPER_ADMIN' || remainingSeconds === null) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print flex items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-950"
    >
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Platform Yöneticisi (SUPER_ADMIN) oturumunuz güvenlik gereği yenileme (refresh) token&apos;ı
          kullanmaz ve <strong>{remainingSeconds} saniye</strong> içinde sona erecektir.
        </span>
      </div>
      <Link
        to="/platform/login"
        className="underline underline-offset-2 hover:text-amber-800"
      >
        Yeniden Giriş Yap
      </Link>
    </div>
  );
}
