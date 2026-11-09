import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/store';
import { setCredentials } from '@/store/authSlice';
import { queryClient } from '@/lib/api/queryClient';
import { administrationApi } from '../api/administrationApi';
import { examRulesApi } from '@/features/exam-rules/api/examRulesApi';
import { UsersPage } from '../pages/UsersPage';
import { SubjectsPage } from '../pages/SubjectsPage';
import { ExamRulesPage } from '@/features/exam-rules/pages/ExamRulesPage';
import { ClassroomsPage } from '@/features/analytics/pages/ClassroomsPage';
import type {
  AdminUserSummary,
  ClassroomResponse,
  ExamTypeSubjectRuleResponse,
  SubjectResponse,
  SubjectTopicResponse,
  UserListResponse,
} from '@/types/api';

HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.open = true;
  this.setAttribute('open', '');
};

HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.open = false;
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};

window.HTMLElement.prototype.scrollIntoView = vi.fn();

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const mockUsers: AdminUserSummary[] = [
  {
    id: 'user-admin-1',
    username: 'admin_user',
    email: 'admin@school.com',
    fullName: 'Yönetici Ali',
    role: 'ADMIN',
    active: true,
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'user-teacher-2',
    username: 'teacher_ayse',
    email: 'ayse@school.com',
    fullName: 'Ayşe Hoca',
    role: 'TEACHER',
    active: true,
    createdAt: '2026-01-05T10:00:00Z',
  },
  {
    id: 'user-student-3',
    username: 'student_mehmet',
    email: 'mehmet@school.com',
    fullName: 'Mehmet Yılmaz',
    role: 'STUDENT',
    active: false,
    createdAt: '2026-02-01T10:00:00Z',
  },
];

const mockUserListResponse: UserListResponse = {
  totalElements: 3,
  page: 0,
  size: 15,
  content: mockUsers,
};

const mockSubjects: SubjectResponse[] = [
  { id: 'sub-mat-1', name: 'Temel Matematik', createdAt: '2026-01-01T10:00:00Z' },
  { id: 'sub-fiz-2', name: 'Fizik', createdAt: '2026-01-02T10:00:00Z' },
];

const mockTopics: SubjectTopicResponse[] = [
  { id: 'top-1', subjectId: 'sub-mat-1', name: 'Türev', code: 'MAT-01', orderIndex: 1, createdAt: '2026-01-01T10:00:00Z' },
  { id: 'top-2', subjectId: 'sub-mat-1', name: 'İntegral', code: 'MAT-02', orderIndex: 2, createdAt: '2026-01-02T10:00:00Z' },
];

const mockTytRules: ExamTypeSubjectRuleResponse[] = [
  {
    examType: 'TYT',
    subjectId: 'sub-mat-1',
    subjectName: 'Temel Matematik',
    questionCount: 40,
    penaltyDivisor: 4.0,
  },
];

const mockClassrooms: ClassroomResponse[] = [
  { id: 'cls-12a', name: '12-A Şubesi', created_at: '2026-01-01T10:00:00Z' },
];

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('Phase 1 — Part C: Kurum İdaresi & Paylaşılan Sınav Kuralları', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    cleanup();
    queryClient.clear();

    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'admin-access-token-jwt',
          refreshToken: 'admin-refresh-token-jwt',
          userId: 'user-admin-1',
          username: 'admin_user',
          role: 'ADMIN',
        },
        tenantId: 'bilfen_koleji',
      })
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. UsersPage Listing, Search, Filter & Pagination
  // ───────────────────────────────────────────────────────────────────────────
  it('renders user list, debounced search, role filter, and pagination', async () => {
    let lastQuery = '';

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/v1/users')) {
        lastQuery = url;
        return new Response(JSON.stringify(mockUserListResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 404 });
    });

    renderWithProviders(<UsersPage />);

    expect(await screen.findByText('Yönetici Ali')).toBeInTheDocument();
    expect(screen.getByText('Ayşe Hoca')).toBeInTheDocument();
    expect(screen.getByText('Mehmet Yılmaz')).toBeInTheDocument();

    // Check role badges
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByText('TEACHER')).toBeInTheDocument();
    expect(screen.getByText('STUDENT')).toBeInTheDocument();

    // Check status badges
    expect(screen.getAllByText('Aktif').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Pasif')).toBeInTheDocument();

    // Test search filter input
    const searchInput = screen.getByLabelText('Kullanıcı Ara');
    fireEvent.change(searchInput, { target: { value: 'mehmet' } });

    await waitFor(
      () => {
        expect(lastQuery).toContain('search=mehmet');
      },
      { timeout: 1000 }
    );

    // Test role filter select
    const roleSelect = screen.getByLabelText(/Rol Filtresi/i);
    fireEvent.change(roleSelect, { target: { value: 'TEACHER' } });

    await waitFor(() => {
      expect(lastQuery).toContain('role=TEACHER');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. UserRegisterDialog: Creates new tenant user
  // ───────────────────────────────────────────────────────────────────────────
  it('creates new user via UserRegisterDialog with header-only X-Tenant-Id', async () => {
    let registerPayload: any = null;
    let registerHeaders: Headers | null = null;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/api/v1/users')) {
        return new Response(JSON.stringify(mockUserListResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/v1/auth/register') && init?.method === 'POST') {
        registerPayload = JSON.parse(String(init.body));
        registerHeaders = new Headers(init.headers);
        return new Response(
          JSON.stringify({
            userId: 'new-user-id',
            username: registerPayload.username,
            role: registerPayload.role,
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(null, { status: 404 });
    });

    renderWithProviders(<UsersPage />);

    // Click "Yeni Kullanıcı Ekle" button
    const addBtn = await screen.findByRole('button', { name: /Yeni Kullanıcı Ekle/i });
    fireEvent.click(addBtn);

    // Dialog title
    expect(screen.getByText('Yeni Kurum Kullanıcısı Ekle')).toBeInTheDocument();

    // Fill form
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Kullanıcı Rolü/i), { target: { value: 'TEACHER' } });
    fireEvent.change(within(dialog).getByLabelText(/Kullanıcı Adı/i), { target: { value: 'kemal_ogretmen' } });
    fireEvent.change(within(dialog).getByLabelText(/Ad Soyad/i), { target: { value: 'Kemal Sunal' } });
    fireEvent.change(within(dialog).getByLabelText(/E-Posta Adresi/i), { target: { value: 'kemal@school.com' } });
    fireEvent.change(within(dialog).getByLabelText(/Başlangıç Şifresi/i), { target: { value: 'SuperSecret123!' } });

    // Submit
    const submitBtn = within(dialog).getByRole('button', { name: /Kullanıcıyı Kaydet/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(registerPayload).not.toBeNull();
    });

    // Invariant check: X-Tenant-Id in header, NOT in body
    expect((registerHeaders as Headers | null)?.get('X-Tenant-Id')).toBe('bilfen_koleji');
    expect(registerPayload.tenantId).toBeUndefined();
    expect(registerPayload.username).toBe('kemal_ogretmen');
    expect(registerPayload.fullName).toBe('Kemal Sunal');
    expect(registerPayload.email).toBe('kemal@school.com');
    expect(registerPayload.role).toBe('TEACHER');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. UserEditDialog: Patches user info and active status
  // ───────────────────────────────────────────────────────────────────────────
  it('updates user active status and full name via UserEditDialog (PATCH /api/v1/users/{id})', async () => {
    let patchUrl = '';
    let patchPayload: any = null;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/api/v1/users') && init?.method === 'PATCH') {
        patchUrl = url;
        patchPayload = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({
            ...mockUsers[0],
            fullName: patchPayload.fullName,
            active: patchPayload.active,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/api/v1/users')) {
        return new Response(JSON.stringify(mockUserListResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 404 });
    });

    renderWithProviders(<UsersPage />);

    // Click edit button for "Yönetici Ali"
    const editBtn = await screen.findByRole('button', {
      name: /Yönetici Ali kullanıcısını düzenle/i,
    });
    fireEvent.click(editBtn);

    expect(screen.getByText('Kullanıcı Bilgilerini Düzenle')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');

    // Modify full name and status inside dialog
    const nameInput = within(dialog).getByLabelText(/Ad Soyad/i);
    fireEvent.change(nameInput, { target: { value: 'Ali Veli Güncel' } });

    const activeSelect = within(dialog).getByLabelText(/Hesap Durumu/i);
    fireEvent.change(activeSelect, { target: { value: 'false' } });

    // Save
    const saveBtn = within(dialog).getByRole('button', { name: /Değişiklikleri Kaydet/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(patchUrl).toContain('/api/v1/users/user-admin-1');
      expect(patchPayload).toEqual({
        fullName: 'Ali Veli Güncel',
        email: 'admin@school.com',
        active: false,
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. UserResetPasswordDialog: Resets user password
  // ───────────────────────────────────────────────────────────────────────────
  it('resets user password via UserResetPasswordDialog (POST /api/v1/users/{id}/reset-password)', async () => {
    let resetUrl = '';
    let resetPayload: any = null;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/reset-password') && init?.method === 'POST') {
        resetUrl = url;
        resetPayload = JSON.parse(String(init.body));
        return new Response(JSON.stringify({ reset: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/v1/users')) {
        return new Response(JSON.stringify(mockUserListResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 404 });
    });

    renderWithProviders(<UsersPage />);

    // Click reset password button for "Ayşe Hoca"
    const resetBtn = await screen.findByRole('button', {
      name: /Ayşe Hoca şifresini sıfırla/i,
    });
    fireEvent.click(resetBtn);

    expect(screen.getByText('Kullanıcı Şifresini Sıfırla')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');

    // Fill password fields inside dialog
    fireEvent.change(within(dialog).getByLabelText(/^Yeni Şifre \*/i), {
      target: { value: 'NewPassword123' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Yeni Şifre \(Tekrar\)/i), {
      target: { value: 'NewPassword123' },
    });

    const submitBtn = within(dialog).getByRole('button', { name: /Şifreyi Güncelle/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(resetUrl).toContain('/api/v1/users/user-teacher-2/reset-password');
      expect(resetPayload).toEqual({ newPassword: 'NewPassword123' });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. SubjectsPage: Listing & Subject Creation
  // ───────────────────────────────────────────────────────────────────────────
  it('renders subjects list and creates new subject via SubjectCreateDialog', async () => {
    let createSubjectPayload: any = null;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/api/v1/subjects') && init?.method === 'POST') {
        createSubjectPayload = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({
            id: 'sub-biyo-3',
            name: createSubjectPayload.name,
            createdAt: '2026-03-01T10:00:00Z',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/api/v1/subjects')) {
        return new Response(JSON.stringify(mockSubjects), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 404 });
    });

    renderWithProviders(<SubjectsPage />);

    expect(await screen.findByText('Temel Matematik')).toBeInTheDocument();
    expect(screen.getByText('Fizik')).toBeInTheDocument();

    // Open create dialog
    const addBtn = screen.getByRole('button', { name: /Yeni Ders Ekle/i });
    fireEvent.click(addBtn);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Yeni Ders Ekle')).toBeInTheDocument();

    const nameInput = within(dialog).getByLabelText(/Ders Adı/i);
    fireEvent.change(nameInput, { target: { value: 'Biyoloji' } });

    const submitBtn = within(dialog).getByRole('button', { name: /Dersi Kaydet/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSubjectPayload).toEqual({ name: 'Biyoloji' });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. TopicManageDialog: Curriculum Management CRUD
  // ───────────────────────────────────────────────────────────────────────────
  it('lists topics, creates new topic, and deletes topic in TopicManageDialog', async () => {
    let createTopicPayload: any = null;
    let deletedTopicUrl = '';

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/topics') && init?.method === 'POST') {
        createTopicPayload = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({
            id: 'top-3',
            subjectId: 'sub-mat-1',
            name: createTopicPayload.name,
            code: createTopicPayload.code,
            orderIndex: createTopicPayload.orderIndex,
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/topics/') && init?.method === 'DELETE') {
        deletedTopicUrl = url;
        return new Response(null, { status: 204 });
      }
      if (url.includes('/topics')) {
        return new Response(JSON.stringify(mockTopics), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/v1/subjects')) {
        return new Response(JSON.stringify(mockSubjects), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 404 });
    });

    renderWithProviders(<SubjectsPage />);

    // Click "Konuları Yönet" for Temel Matematik
    const curriculumBtn = await screen.findByRole('button', {
      name: /Temel Matematik konularını yönet/i,
    });
    fireEvent.click(curriculumBtn);

    expect(await screen.findByText('Türev')).toBeInTheDocument();
    expect(screen.getByText('İntegral')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');

    // Create topic "Limit"
    fireEvent.change(within(dialog).getByLabelText(/Konu Adı/i), { target: { value: 'Limit' } });
    fireEvent.change(within(dialog).getByLabelText(/Sıra No/i), { target: { value: '3' } });

    const addTopicBtn = within(dialog).getByRole('button', { name: /Konuyu Ekle/i });
    fireEvent.click(addTopicBtn);

    await waitFor(() => {
      expect(createTopicPayload).toEqual({
        name: 'Limit',
        orderIndex: 3,
      });
    });

    // Delete topic "Türev"
    const deleteBtn = within(dialog).getByRole('button', { name: /Türev konusunu sil/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(deletedTopicUrl).toContain('/api/v1/subjects/sub-mat-1/topics/top-1');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. ExamRulesPage: Net Calculation Rules & ExamRuleEnsureDialog
  // ───────────────────────────────────────────────────────────────────────────
  it('renders exam type tabs, default divisor badges, and upserts rule via ExamRuleEnsureDialog', async () => {
    let upsertedRuleUrl = '';
    let upsertedRulePayload: any = null;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/api/v1/exam-rules/LGS/sub-mat-1') && init?.method === 'PUT') {
        upsertedRuleUrl = url;
        upsertedRulePayload = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({
            examType: 'LGS',
            subjectId: 'sub-mat-1',
            subjectName: 'Temel Matematik',
            questionCount: upsertedRulePayload.questionCount,
            penaltyDivisor: upsertedRulePayload.penaltyDivisor,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/api/v1/exam-rules/LGS')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/v1/exam-rules/TYT')) {
        return new Response(JSON.stringify(mockTytRules), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/v1/subjects')) {
        return new Response(JSON.stringify(mockSubjects), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 404 });
    });

    renderWithProviders(<ExamRulesPage />);

    // TYT default active
    expect(await screen.findByText('Temel Matematik')).toBeInTheDocument();
    expect(screen.getByText('Kural Tanımlı')).toBeInTheDocument();
    expect(screen.getByText('Kural Eksik')).toBeInTheDocument();

    // Switch tab to LGS
    const lgsTab = screen.getByRole('tab', { name: /LGS/i });
    fireEvent.click(lgsTab);

    // Divisor badge updates to 3 Yanlış = 1 Doğru for LGS
    expect(screen.getByText('3 Yanlış = 1 Doğru')).toBeInTheDocument();

    // Click "Kural Tanımla" for Temel Matematik under LGS
    const defineRuleBtn = await screen.findByRole('button', {
      name: /Temel Matematik dersi için LGS net kuralını düzenle/i,
    });
    fireEvent.click(defineRuleBtn);

    // Dialog opens
    expect(screen.getByText('Net Hesaplama Kuralı Tanımla')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');

    // Fill Question Count = 20, Divisor = 3.0
    const qcInput = within(dialog).getByLabelText(/Toplam Soru Sayısı/i);
    fireEvent.change(qcInput, { target: { value: '20' } });

    const divisorSelect = within(dialog).getByLabelText(/Ceza Katsayısı/i);
    fireEvent.change(divisorSelect, { target: { value: '3' } });

    const saveRuleBtn = within(dialog).getByRole('button', { name: /Kuralı Kaydet/i });
    fireEvent.click(saveRuleBtn);

    await waitFor(() => {
      expect(upsertedRuleUrl).toContain('/api/v1/exam-rules/LGS/sub-mat-1');
      expect(upsertedRulePayload).toEqual({
        questionCount: 20,
        penaltyDivisor: 3,
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. ClassroomsPage Admin Actions: Create Classroom & Manage Roster
  // ───────────────────────────────────────────────────────────────────────────
  it('creates classroom via ClassroomCreateDialog and manages roster via ClassroomRosterDialog', async () => {
    let createdClassroomPayload: any = null;
    let addedTeacherPayload: any = null;
    let deletedTeacherUrl = '';
    let addedStudentPayload: any = null;
    let deletedStudentUrl = '';

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      // Classrooms list
      if (url.endsWith('/api/v1/classrooms') && (!init || init.method === 'GET')) {
        return new Response(JSON.stringify(mockClassrooms), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Create classroom
      if (url.endsWith('/api/v1/classrooms') && init?.method === 'POST') {
        createdClassroomPayload = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({ id: 'cls-12b', name: createdClassroomPayload.name }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Classroom Teachers
      if (url.includes('/teachers') && init?.method === 'POST') {
        addedTeacherPayload = JSON.parse(String(init.body));
        return new Response(null, { status: 204 });
      }
      if (url.includes('/teachers/') && init?.method === 'DELETE') {
        deletedTeacherUrl = url;
        return new Response(null, { status: 204 });
      }
      if (url.includes('/teachers')) {
        return new Response(
          JSON.stringify([
            { id: 't-1', username: 'teacher_ayse', email: 'ayse@school.com', fullName: 'Ayşe Hoca' },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Classroom Students
      if (url.includes('/students') && init?.method === 'POST') {
        addedStudentPayload = JSON.parse(String(init.body));
        return new Response(null, { status: 204 });
      }
      if (url.includes('/students/') && init?.method === 'DELETE') {
        deletedStudentUrl = url;
        return new Response(null, { status: 204 });
      }
      if (url.includes('/students')) {
        return new Response(
          JSON.stringify([
            { id: 's-1', username: 'student_mehmet', email: 'mehmet@school.com', fullName: 'Mehmet Yılmaz' },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Users query for roster candidate selection
      if (url.includes('/api/v1/users')) {
        return new Response(JSON.stringify(mockUserListResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(null, { status: 404 });
    });

    renderWithProviders(<ClassroomsPage />);

    expect(await screen.findByText('12-A Şubesi')).toBeInTheDocument();

    // 1. Create Classroom Dialog
    const createClassBtn = screen.getByRole('button', { name: /Yeni Sınıf Tanımla/i });
    fireEvent.click(createClassBtn);

    expect(screen.getByText('Yeni Sınıf & Şube Tanımla')).toBeInTheDocument();

    const classNameInput = screen.getByLabelText(/Sınıf \/ Şube Adı/i);
    fireEvent.change(classNameInput, { target: { value: '12-B Şubesi' } });

    const submitClassBtn = screen.getByRole('button', { name: /Sınıfı Oluştur/i });
    fireEvent.click(submitClassBtn);

    await waitFor(() => {
      expect(createdClassroomPayload).toEqual({ name: '12-B Şubesi' });
    });

    // 2. Classroom Roster Dialog
    const rosterBtn = screen.getByRole('button', { name: /Kadro & Öğrenci/i });
    fireEvent.click(rosterBtn);

    expect(await screen.findByText(/12-A Şubesi — Kadro ve Öğrenci Yönetimi/i)).toBeInTheDocument();
    const rosterDialog = screen.getByRole('dialog');

    // Wait for candidate teacher option to load
    await within(rosterDialog).findByRole('option', { name: /Ayşe Hoca/i });
    const candidateTeacherSelect = within(rosterDialog).getByLabelText(/Atanacak üye seçin/i);
    fireEvent.change(candidateTeacherSelect, { target: { value: 'user-teacher-2' } });

    const assignTeacherBtn = within(rosterDialog).getByRole('button', { name: /Sınıfa Ata/i });
    fireEvent.click(assignTeacherBtn);

    await waitFor(() => {
      expect(addedTeacherPayload).toEqual({ userId: 'user-teacher-2' });
    });

    // Teacher Roster: remove existing teacher
    const removeTeacherBtn = within(rosterDialog).getByRole('button', {
      name: /Ayşe Hoca öğretmenini sınıftan çıkar/i,
    });
    fireEvent.click(removeTeacherBtn);

    await waitFor(() => {
      expect(deletedTeacherUrl).toContain('/api/v1/classrooms/cls-12a/teachers/t-1');
    });

    // Switch to Students Tab
    const studentsTab = within(rosterDialog).getByRole('tab', { name: /Öğrenciler/i });
    fireEvent.click(studentsTab);

    // Wait for candidate student option to load in select
    await within(rosterDialog).findByRole('option', { name: /Mehmet Yılmaz/i });
    const candidateStudentSelect = within(rosterDialog).getByLabelText(/Atanacak üye seçin/i);
    fireEvent.change(candidateStudentSelect, { target: { value: 'user-student-3' } });

    const enrollStudentBtn = within(rosterDialog).getByRole('button', { name: /Sınıfa Ata/i });
    fireEvent.click(enrollStudentBtn);

    await waitFor(() => {
      expect(addedStudentPayload).toEqual({ userId: 'user-student-3' });
    });

    // Student Roster: remove existing student
    const removeStudentBtn = within(rosterDialog).getByRole('button', {
      name: /Mehmet Yılmaz öğrencisini sınıftan çıkar/i,
    });
    fireEvent.click(removeStudentBtn);

    await waitFor(() => {
      expect(deletedStudentUrl).toContain('/api/v1/classrooms/cls-12a/students/s-1');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 9. Enforce Tenant Headers & Omit Gateway Spoofing Headers
  // ───────────────────────────────────────────────────────────────────────────
  it('enforces tenant security invariants: Authorization and X-Tenant-Id present, spoofing headers omitted', async () => {
    const interceptedRequests: { url: string; headers: Headers }[] = [];

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      interceptedRequests.push({ url, headers });

      if (url.includes('/api/v1/users')) {
        return new Response(JSON.stringify(mockUserListResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/v1/subjects')) {
        return new Response(JSON.stringify(mockSubjects), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/api/v1/exam-rules')) {
        return new Response(JSON.stringify(mockTytRules), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 404 });
    });

    // Execute administration & rules api methods
    await administrationApi.fetchUsers({ page: 0, size: 10 });
    await administrationApi.fetchSubjects();
    await examRulesApi.fetchRules('TYT');

    expect(interceptedRequests.length).toBe(3);

    for (const req of interceptedRequests) {
      expect(req.headers.get('Authorization')).toBe('Bearer admin-access-token-jwt');
      expect(req.headers.get('X-Tenant-Id')).toBe('bilfen_koleji');
      expect(req.headers.get('X-User-Id')).toBeNull();
      expect(req.headers.get('X-User-Role')).toBeNull();
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 10. Form Validation & Server Error Alerts in Dialogs
  // ───────────────────────────────────────────────────────────────────────────
  it('enforces client-side validation constraints and surfaces server error alerts', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/api/v1/subjects') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            status: 400,
            error: 'BAD_REQUEST',
            message: 'Bu isimde bir ders zaten tanımlı.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/api/v1/subjects')) {
        return new Response(JSON.stringify(mockSubjects), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 404 });
    });

    renderWithProviders(<SubjectsPage />);

    // Open create dialog
    const addBtn = screen.getByRole('button', { name: /Yeni Ders Ekle/i });
    fireEvent.click(addBtn);

    const dialog = screen.getByRole('dialog');
    const submitBtn = within(dialog).getByRole('button', { name: /Dersi Kaydet/i });

    // 1. Client-side empty validation
    fireEvent.click(submitBtn);
    expect(await within(dialog).findByText('Ders adı en az 2 karakter olmalıdır')).toBeInTheDocument();

    // 2. Server-side error alert handling
    const nameInput = within(dialog).getByLabelText(/Ders Adı/i);
    fireEvent.change(nameInput, { target: { value: 'Mevcut Ders' } });
    fireEvent.click(submitBtn);

    expect(await within(dialog).findByText('Bu isimde bir ders zaten tanımlı.')).toBeInTheDocument();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 11. Role-Based Access Control (RBAC) UI Invariants for TEACHER
  // ───────────────────────────────────────────────────────────────────────────
  it('hides admin-only actions on ClassroomsPage when logged in as TEACHER', async () => {
    store.dispatch(
      setCredentials({
        auth: {
          accessToken: 'teacher-token',
          refreshToken: 'teacher-refresh',
          userId: 'user-teacher-2',
          username: 'teacher_ayse',
          role: 'TEACHER',
        },
        tenantId: 'bilfen_koleji',
      })
    );

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/api/v1/classrooms')) {
        return new Response(JSON.stringify(mockClassrooms), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 404 });
    });

    renderWithProviders(<ClassroomsPage />);

    expect(await screen.findByText('12-A Şubesi')).toBeInTheDocument();

    // TEACHER must NOT see admin buttons
    expect(screen.queryByRole('button', { name: /Yeni Sınıf Tanımla/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Kadro & Öğrenci/i })).not.toBeInTheDocument();

    // TEACHER CAN see "Gözlem Ekle" button
    expect(screen.getByRole('button', { name: /Gözlem Ekle/i })).toBeInTheDocument();
  });
});
