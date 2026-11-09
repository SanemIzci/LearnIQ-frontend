import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TenantLoginPage, PlatformLoginPage } from '@/features/auth';
import { TenantsPage, GlobalAdminsPage } from '@/features/platform';
import { ExamsPage, ExamDetailPage } from '@/features/exams';
import {
  OverviewPage,
  ClassroomsPage,
  ClassroomAnalyticsPage,
  StudentAnalyticsPage,
} from '@/features/analytics';
import { AdminAiAssistantPage } from '@/features/ai-rag';
import {
  PublicSharePage,
  StudentExamDashboardPage,
  StudentExamsPage,
  StudentHomePage,
  StudentProfilePage,
} from '@/features/student-portal';
import { RoleGuard } from './RoleGuard';

interface RoutePlaceholderProps {
  title: string;
  phase: string;
  owner: string;
  endpoints: string[];
}

/**
 * Phase 0 structural route shell.
 * Feature-specific business screens will be mounted in Phases 1–4.
 */
function RoutePlaceholder({ title, phase, owner, endpoints }: RoutePlaceholderProps) {
  return (
    <div className="mx-auto max-w-3xl py-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle as="h1">{title}</CardTitle>
            <Badge variant="secondary">{phase}</Badge>
          </div>
          <CardDescription>Sorumlu Modül Ajanı: {owner}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Faz 0 (Temel Altyapı &amp; Kontrat Katmanı) rota iskeleti hazır. Bu ekran ilgili faz
            onaylandıktan sonra aşağıdaki doğrulanmış backend uç noktalarına bağlanacaktır:
          </p>
          <ul className="list-disc pl-5 text-xs font-mono space-y-1 text-foreground">
            {endpoints.map((ep) => (
              <li key={ep}>{ep}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  // Public Routes
  {
    path: '/login',
    element: <TenantLoginPage />,
  },
  {
    path: '/platform/login',
    element: <PlatformLoginPage />,
  },
  {
    path: '/share/:token',
    element: <PublicSharePage />,
  },

  // Protected Application Shell
  {
    element: <AppShell />,
    children: [
      // SUPER_ADMIN Portal (Isolated from tenant-scoped endpoints)
      {
        element: <RoleGuard allowedRoles={['SUPER_ADMIN']} />,
        children: [
          {
            path: '/platform/tenants',
            element: <TenantsPage />,
          },
          {
            path: '/platform/admins',
            element: <GlobalAdminsPage />,
          },
        ],
      },

      // Staff Portal (ADMIN & TEACHER)
      {
        element: <RoleGuard allowedRoles={['ADMIN', 'TEACHER']} />,
        children: [
          {
            path: '/staff/overview',
            element: <OverviewPage />,
          },
          {
            path: '/staff/classrooms',
            element: <ClassroomsPage />,
          },
          {
            path: '/staff/classrooms/:classroomId/analytics',
            element: <ClassroomAnalyticsPage />,
          },
          {
            path: '/staff/subjects',
            element: (
              <RoutePlaceholder
                title="Ders ve Konu Yönetimi"
                phase="Faz 1"
                owner="Agent-1 (src/features/administration)"
                endpoints={[
                  'GET /api/v1/subjects',
                  'POST /api/v1/subjects',
                  'GET /api/v1/subjects/{id}/topics',
                ]}
              />
            ),
          },
          {
            path: '/staff/exam-rules',
            element: (
              <RoutePlaceholder
                title="Sınav Tipi Net Hesaplama Kuralları"
                phase="Faz 1 (Paylaşılan Modül)"
                owner="Agent-1 & Agent-2 (src/features/exam-rules)"
                endpoints={[
                  'GET /api/v1/exam-rules/{examType}',
                  'PUT /api/v1/exam-rules/{examType}/{subjectId}',
                ]}
              />
            ),
          },
          {
            path: '/staff/exams',
            element: <ExamsPage />,
          },
          {
            path: '/staff/exams/:examId',
            element: <ExamDetailPage />,
          },
          {
            path: '/staff/students/:studentId',
            element: <StudentAnalyticsPage />,
          },
        ],
      },

      // Tenant ADMIN & Platform SUPER_ADMIN Routes
      {
        element: <RoleGuard allowedRoles={['ADMIN', 'SUPER_ADMIN']} />,
        children: [
          {
            path: '/staff/users',
            element: (
              <RoutePlaceholder
                title="Kurum Kullanıcı Yönetimi"
                phase="Faz 1"
                owner="Agent-1 (src/features/administration)"
                endpoints={['GET /api/v1/users', 'POST /api/v1/auth/register']}
              />
            ),
          },
          {
            path: '/staff/ai-assistant',
            element: <AdminAiAssistantPage />,
          },
        ],
      },

      // Student Portal
      {
        element: <RoleGuard allowedRoles={['STUDENT']} />,
        children: [
          {
            path: '/student/home',
            element: <StudentHomePage />,
          },
          {
            path: '/student/exams',
            element: <StudentExamsPage />,
          },
          {
            path: '/student/exams/:examId/dashboard',
            element: <StudentExamDashboardPage />,
          },
          {
            path: '/student/profile',
            element: <StudentProfilePage />,
          },
        ],
      },
    ],
  },
]);

