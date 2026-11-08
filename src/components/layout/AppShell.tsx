import * as React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Building2,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Scale,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { setMobileNavOpen, dismissToast } from '@/store/uiSlice';
import { logoutSession } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/api';
import { SuperAdminExpiryBanner } from './SuperAdminExpiryBanner';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  // SUPER_ADMIN Platform Portal
  {
    label: 'Kurumlar (Tenants)',
    to: '/platform/tenants',
    icon: Building2,
    roles: ['SUPER_ADMIN'],
  },
  {
    label: 'Platform Yöneticileri',
    to: '/platform/admins',
    icon: ShieldCheck,
    roles: ['SUPER_ADMIN'],
  },
  // Staff (ADMIN & TEACHER)
  {
    label: 'Genel Bakış & Karşılaştırma',
    to: '/staff/overview',
    icon: BarChart3,
    roles: ['ADMIN', 'TEACHER'],
  },
  {
    label: 'Sınav Yönetimi',
    to: '/staff/exams',
    icon: ClipboardCheck,
    roles: ['ADMIN', 'TEACHER'],
  },
  {
    label: 'Sınıflar & Analitik',
    to: '/staff/classrooms',
    icon: GraduationCap,
    roles: ['ADMIN', 'TEACHER'],
  },
  {
    label: 'Dersler & Konular',
    to: '/staff/subjects',
    icon: BookOpen,
    roles: ['ADMIN', 'TEACHER'],
  },
  {
    label: 'Sınav Net Kuralları',
    to: '/staff/exam-rules',
    icon: Scale,
    roles: ['ADMIN', 'TEACHER'],
  },
  {
    label: 'Kullanıcı Yönetimi',
    to: '/staff/users',
    icon: Users,
    roles: ['ADMIN'],
  },
  {
    label: 'AI RAG Asistanı',
    to: '/staff/ai-assistant',
    icon: Sparkles,
    roles: ['ADMIN'],
  },
  // Student Portal
  {
    label: 'Öğrenci Ana Sayfa',
    to: '/student/home',
    icon: Home,
    roles: ['STUDENT'],
  },
  {
    label: 'Sınavlarım & Sonuç Girişi',
    to: '/student/exams',
    icon: FileSpreadsheet,
    roles: ['STUDENT'],
  },
  {
    label: 'Profilim & Rozetler',
    to: '/student/profile',
    icon: UserCheck,
    roles: ['STUDENT'],
  },
];

export function AppShell() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, tenantId } = useAppSelector((state) => state.auth);
  const { mobileNavOpen, toasts } = useAppSelector((state) => state.ui);
  const mainRef = React.useRef<HTMLElement | null>(null);
  const menuButtonRef = React.useRef<HTMLButtonElement | null>(null);

  // Manage `inert` attribute on main content when mobile navigation drawer is open
  React.useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;
    if (mobileNavOpen) {
      mainEl.setAttribute('inert', '');
    } else {
      mainEl.removeAttribute('inert');
    }
  }, [mobileNavOpen]);

  // Automatically close mobile drawer if viewport is resized to desktop (`lg`: 1024px)
  // so `<main inert>` never remains active when the mobile drawer becomes static sidebar (D4)
  React.useEffect(() => {
    if (!mobileNavOpen || typeof window === 'undefined') return;

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        dispatch(setMobileNavOpen(false));
      }
    };

    const mql =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(min-width: 1024px)')
        : null;

    if (mql?.matches) {
      dispatch(setMobileNavOpen(false));
      return;
    }

    const handleMediaChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        dispatch(setMobileNavOpen(false));
      }
    };

    mql?.addEventListener?.('change', handleMediaChange);
    window.addEventListener('resize', handleResize);
    return () => {
      mql?.removeEventListener?.('change', handleMediaChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [mobileNavOpen, dispatch]);

  // Allow Escape key to close the mobile navigation drawer and restore focus
  React.useEffect(() => {
    if (!mobileNavOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dispatch(setMobileNavOpen(false));
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileNavOpen, dispatch]);

  // Close mobile drawer on route change
  React.useEffect(() => {
    dispatch(setMobileNavOpen(false));
  }, [location.pathname, dispatch]);

  const visibleNavItems = React.useMemo(() => {
    if (!user) return [];
    return NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  }, [user]);

  const handleLogout = async () => {
    const wasSuperAdmin = user?.role === 'SUPER_ADMIN';
    await logoutSession();
    navigate(wasSuperAdmin ? '/platform/login' : '/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <a
        href="#content"
        className="visually-hidden fixed left-4 top-4 z-50 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow"
      >
        Ana içeriğe atla
      </a>

      <SuperAdminExpiryBanner />

      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Button
            ref={menuButtonRef}
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={mobileNavOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            aria-expanded={mobileNavOpen}
            aria-controls="primary-sidebar"
            onClick={() => dispatch(setMobileNavOpen(!mobileNavOpen))}
          >
            {mobileNavOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
          <span className="text-base font-bold tracking-tight text-primary">LearnIQ</span>
          {tenantId ? (
            <Badge variant="secondary">Kurum: {tenantId}</Badge>
          ) : user?.role === 'SUPER_ADMIN' ? (
            <Badge variant="default">Platform Yönetimi</Badge>
          ) : null}
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs sm:block">
              <p className="font-medium text-foreground">{user.username}</p>
              <p className="text-muted-foreground">{user.role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Çıkış</span>
            </Button>
          </div>
        ) : null}
      </header>

      <div className="flex flex-1">
        <aside
          id="primary-sidebar"
          className={cn(
            'no-print fixed inset-y-14 left-0 z-20 w-64 border-r bg-card p-4 transition-transform lg:static lg:block lg:translate-x-0',
            mobileNavOpen ? 'block translate-x-0 shadow-lg' : 'hidden -translate-x-full lg:block'
          )}
        >
          <nav aria-label="Ana menü">
            <ul className="space-y-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.to ||
                  location.pathname.startsWith(`${item.to}/`);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <main
          ref={mainRef}
          id="content"
          tabIndex={-1}
          className="print-container flex-1 p-4 lg:p-6"
        >
          <Outlet />
        </main>
      </div>

      {/* Accessible Polite Toast Region */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="no-print fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'flex items-start justify-between gap-3 rounded-lg border p-3 text-sm shadow-md bg-card text-card-foreground',
              toast.variant === 'destructive' &&
                'border-destructive bg-destructive text-destructive-foreground'
            )}
          >
            <div>
              <p className="font-semibold">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 text-xs opacity-90">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Bildirimi kapat"
              onClick={() => dispatch(dismissToast(toast.id))}
              className="opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
