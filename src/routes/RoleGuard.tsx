import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store';
import type { UserRole } from '@/types/api';

export interface RoleGuardProps {
  allowedRoles: UserRole[];
}

export function defaultHomeForRole(role: UserRole): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/platform/tenants';
    case 'ADMIN':
    case 'TEACHER':
      return '/staff/overview';
    case 'STUDENT':
      return '/student/home';
  }
}

/**
 * UX & Navigation Route Guard ONLY.
 *
 * Architectural Rule:
 * Frontend RoleGuard prevents accidental navigation and routes users to their
 * role-appropriate workspace. It is NOT a security boundary; backend services
 * (Gateway JWT + in-service JwtAuthenticationFilter + AccessControlService)
 * remain the sole authoritative security boundary.
 */
export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const location = useLocation();
  const { isAuthenticated, isInitialized, user } = useAppSelector((state) => state.auth);

  if (!isInitialized) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-sm text-muted-foreground">
        Oturum doğrulanıyor...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    const isPlatformPath = location.pathname.startsWith('/platform');
    const loginPath = isPlatformPath ? '/platform/login' : '/login';
    return <Navigate to={loginPath} state={{ from: location.pathname }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={defaultHomeForRole(user.role)} replace />;
  }

  return <Outlet />;
}

