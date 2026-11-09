import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { TenantLoginPage, PlatformLoginPage } from '@/features/auth';
import { TenantsPage, GlobalAdminsPage } from '@/features/platform';
import { ExamsPage, ExamDetailPage } from '@/features/exams';
import { ExamRulesPage } from '@/features/exam-rules';
import { UsersPage, SubjectsPage } from '@/features/administration';
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
            element: <SubjectsPage />,
          },
          {
            path: '/staff/exam-rules',
            element: <ExamRulesPage />,
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
            element: <UsersPage />,
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

