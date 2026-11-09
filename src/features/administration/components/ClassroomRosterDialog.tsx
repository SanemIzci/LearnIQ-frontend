import * as React from 'react';
import {
  GraduationCap,
  Loader2,
  Plus,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/error-parser';
import { addMemberSchema } from '../schemas/classroomSchemas';
import {
  useAddClassroomStudentMutation,
  useAddClassroomTeacherMutation,
  useAdminUsersQuery,
  useClassroomStudentsQuery,
  useClassroomTeachersQuery,
  useRemoveClassroomStudentMutation,
  useRemoveClassroomTeacherMutation,
} from '../api/administrationApi';
import type { ClassroomResponse } from '@/types/api';

export interface ClassroomRosterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classroom: ClassroomResponse | null;
}

export function ClassroomRosterDialog({
  open,
  onOpenChange,
  classroom,
}: ClassroomRosterDialogProps) {
  const [activeTab, setActiveTab] = React.useState<'teachers' | 'students'>('teachers');
  const [selectedUserId, setSelectedUserId] = React.useState<string>('');
  const [serverError, setServerError] = React.useState<string | null>(null);

  const classroomId = classroom?.id;

  const teachersQuery = useClassroomTeachersQuery(classroomId);
  const studentsQuery = useClassroomStudentsQuery(classroomId);

  const addTeacherMutation = useAddClassroomTeacherMutation(classroomId || '');
  const removeTeacherMutation = useRemoveClassroomTeacherMutation(classroomId || '');
  const addStudentMutation = useAddClassroomStudentMutation(classroomId || '');
  const removeStudentMutation = useRemoveClassroomStudentMutation(classroomId || '');

  // Fetch all potential teachers or students in tenant for selection
  const userRoleToFetch = activeTab === 'teachers' ? 'TEACHER' : 'STUDENT';
  const candidateUsersQuery = useAdminUsersQuery({
    role: userRoleToFetch,
    size: 100,
  });

  const enrolledTeachers = teachersQuery.data || [];
  const enrolledStudents = studentsQuery.data || [];
  const enrolledIds = React.useMemo(() => {
    const list = activeTab === 'teachers' ? enrolledTeachers : enrolledStudents;
    return new Set(list.map((m) => m.id));
  }, [activeTab, enrolledTeachers, enrolledStudents]);

  const candidateUsers = (candidateUsersQuery.data?.content || []).filter(
    (u) => !enrolledIds.has(u.id)
  );

  React.useEffect(() => {
    setSelectedUserId('');
    setServerError(null);
  }, [activeTab, open]);

  if (!classroom) return null;

  const handleAddMember = async () => {
    const parsed = addMemberSchema.safeParse({ userId: selectedUserId });
    if (!parsed.success) {
      setServerError(parsed.error.errors[0]?.message || 'Lütfen geçerli bir üye seçiniz.');
      return;
    }
    setServerError(null);
    try {
      if (activeTab === 'teachers') {
        await addTeacherMutation.mutateAsync(parsed.data.userId);
      } else {
        await addStudentMutation.mutateAsync(parsed.data.userId);
      }
      setSelectedUserId('');
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Üye atama işlemi başarısız oldu.');
      } else {
        setServerError('Üye atanırken bir hata oluştu.');
      }
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setServerError(null);
    try {
      if (activeTab === 'teachers') {
        await removeTeacherMutation.mutateAsync(memberId);
      } else {
        await removeStudentMutation.mutateAsync(memberId);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message || 'Üye sınıftan çıkarılamadı.');
      } else {
        setServerError('Üye sınıftan çıkarılırken bir hata oluştu.');
      }
    }
  };

  const isMutating =
    addTeacherMutation.isPending ||
    removeTeacherMutation.isPending ||
    addStudentMutation.isPending ||
    removeStudentMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isMutating) {
          onOpenChange(nextOpen);
        }
      }}
      title={`${classroom.name} — Kadro ve Öğrenci Yönetimi`}
      description="Sınıfa atanmış öğretmenleri ve kayıtlı öğrencileri yönetin."
      className="max-w-xl"
    >
      <div className="space-y-4">
        {serverError ? (
          <div role="alert" aria-live="polite">
            <Alert variant="destructive" title="İşlem Hatası">
              {serverError}
            </Alert>
          </div>
        ) : null}

        {/* Tab Navigation */}
        <div role="tablist" aria-label="Sınıf Üyeleri" className="flex border-b text-xs font-medium">
          <button
            role="tab"
            id="roster-tab-teachers"
            aria-selected={activeTab === 'teachers'}
            aria-controls="roster-tabpanel"
            type="button"
            onClick={() => setActiveTab('teachers')}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-semibold transition-colors ${
              activeTab === 'teachers'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            <span>Öğretmenler ({enrolledTeachers.length})</span>
          </button>
          <button
            role="tab"
            id="roster-tab-students"
            aria-selected={activeTab === 'students'}
            aria-controls="roster-tabpanel"
            type="button"
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-semibold transition-colors ${
              activeTab === 'students'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            <span>Öğrenciler ({enrolledStudents.length})</span>
          </button>
        </div>

        {/* Add Member Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2 rounded-lg border bg-muted/20 p-2.5">
          <Select
            aria-label="Atanacak üye seçin"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            disabled={isMutating || candidateUsersQuery.isLoading}
            className="text-xs flex-1"
          >
            <option value="">
              {activeTab === 'teachers'
                ? 'Atanacak Öğretmeni Seçiniz...'
                : 'Kayıt Edilecek Öğrenciyi Seçiniz...'}
            </option>
            {candidateUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.username} — {u.email})
              </option>
            ))}
          </Select>

          <Button
            type="button"
            size="sm"
            onClick={handleAddMember}
            disabled={!selectedUserId || isMutating}
            className="h-8 text-xs gap-1 shrink-0 w-full sm:w-auto"
          >
            {isMutating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>Sınıfa Ata</span>
          </Button>
        </div>

        {/* Member List */}
        <div
          role="tabpanel"
          id="roster-tabpanel"
          aria-labelledby={activeTab === 'teachers' ? 'roster-tab-teachers' : 'roster-tab-students'}
          className="space-y-2"
        >
          {activeTab === 'teachers' ? (
            teachersQuery.isLoading ? (
              <div className="flex h-32 items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                <span>Öğretmen kadrosu yükleniyor...</span>
              </div>
            ) : enrolledTeachers.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                Bu sınıfa henüz bir öğretmen atanmamış.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {enrolledTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex items-center justify-between rounded-md border bg-card p-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{teacher.fullName}</span>
                      <span className="text-[11px] text-muted-foreground ml-2">
                        ({teacher.username})
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(teacher.id)}
                      disabled={isMutating}
                      className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1"
                      aria-label={`${teacher.fullName} öğretmenini sınıftan çıkar`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="hidden sm:inline">Kaldır</span>
                    </Button>
                  </div>
                ))}
              </div>
            )
          ) : studentsQuery.isLoading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
              <span>Öğrenci listesi yükleniyor...</span>
            </div>
          ) : enrolledStudents.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
              Bu sınıfa henüz bir öğrenci kaydedilmemiş.
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {enrolledStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between rounded-md border bg-card p-2 text-xs"
                >
                  <div>
                    <span className="font-semibold text-foreground">{student.fullName}</span>
                    <span className="text-[11px] text-muted-foreground ml-2">
                      ({student.username})
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(student.id)}
                    disabled={isMutating}
                    className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1"
                    aria-label={`${student.fullName} öğrencisini sınıftan çıkar`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Kaldır</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
