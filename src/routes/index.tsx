import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TenantLoginPage, PlatformLoginPage } from '@/features/auth';
import { TenantsPage, GlobalAdminsPage } from '@/features/platform';
import { ExamsPage, ExamDetailPage } from '@/features/exams';
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
            element: (
              <RoutePlaceholder
                title="Kurum & Öğretmen Analitik Genel Bakış"
                phase="Faz 4"
                owner="Agent-4 (src/features/analytics)"
                endpoints={[
                  'GET /api/v1/analytics/overview',
                  'GET /api/v1/teachers/me/comparison',
                ]}
              />
            ),
          },
          {
            path: '/staff/classrooms',
            element: (
              <RoutePlaceholder
                title="Sınıf Yönetimi ve Atamalar"
                phase="Faz 1 & Faz 4"
                owner="Agent-1 (src/features/administration) & Agent-4 (src/features/analytics)"
                endpoints={[
                  'GET /api/v1/classrooms',
                  'POST /api/v1/classrooms',
                  'GET /api/v1/teachers/me/classrooms/{id}/analytics',
                ]}
              />
            ),
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
            element: (
              <RoutePlaceholder
                title="Öğrenci Analitiği ve Öğretmen Gözlem Notları"
                phase="Faz 4"
                owner="Agent-4 (src/features/analytics)"
                endpoints={[
                  'GET /api/v1/analytics/students/{studentId}/weaknesses',
                  'GET /api/v1/teachers/me/students/{studentId}/observations',
                ]}
              />
            ),
          },
        ],
      },

      // Tenant ADMIN-Only Routes
      {
        element: <RoleGuard allowedRoles={['ADMIN']} />,
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
            element: (
              <RoutePlaceholder
                title="Admin RAG Doküman İndeksleme ve AI Sohbet"
                phase="Faz 4"
                owner="Agent-4 (src/features/ai-rag)"
                endpoints={[
                  'POST /api/v1/admin/ai/chat',
                  'POST /api/v1/admin/ai/rag/backfill',
                ]}
              />
            ),
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

