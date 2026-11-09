/**
 * LearnIQ Backend API Contracts (Single Source of Truth for Frontend Agents)
 * Verified directly against learniq-backend Java DTOs & Controllers.
 */

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT';

export type ExamStatus = 'OPEN' | 'FINALIZED';

export type ResultStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DRAFT';

export type EntryMethod = 'MANUAL' | 'OCR' | 'TEACHER_BULK';

export type TenantSubscriptionStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';

/**
 * Note: Backend AiReport.ReportStatus includes legacy 'READY' (from clone flow)
 * alongside 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'.
 */
export type AiReportStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'READY'
  | 'FAILED';

// ---------------------------------------------------------------------------
// 1. Common Library Contracts (com.learniq.common.api.*)
// ---------------------------------------------------------------------------

export interface ErrorResponse {
  timestamp?: string;
  status: number;
  error: string;
  message?: string;
  details?: string[];
  messages?: string[];
  path?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  page: number;
  size: number;
  totalPages: number;
}

/**
 * Dual-mode response returned by endpoints where page/size are optional
 * (e.g. GET /api/v1/exams, GET /api/v1/classrooms, GET /api/v1/exams/{id}/results)
 */
export type DualModeListResponse<T> = T[] | PageResponse<T>;

// ---------------------------------------------------------------------------
// 2. Auth & Platform Contracts (auth-service :8081 via Gateway :8080)
// ---------------------------------------------------------------------------

export interface LoginRequest {
  username: string;
  password: string;
  tenantId: string;
}

export interface PlatformLoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  /** Always null for SUPER_ADMIN platform login */
  refreshToken: string | null;
  role: UserRole;
  userId: string;
  username: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  tenantId: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

/**
 * IMPORTANT: Do NOT include tenantId in RegisterRequest payload.
 * AuthController.register reads X-Tenant-Id from the request header.
 */
export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  fullName: string;
  role: Exclude<UserRole, 'SUPER_ADMIN'>;
}

export interface RegisterResponse {
  userId: string;
  message: string;
}

export interface AuthenticatedProfile {
  id: string;
  username: string;
  email?: string;
  full_name?: string;
  fullName?: string;
  role: UserRole;
  active?: boolean;
}

export interface TenantSummary {
  id: string;
  name: string;
  domain: string | null;
  subscriptionStatus: TenantSubscriptionStatus;
  createdAt: string;
}

export interface TenantDetail extends TenantSummary {
  userCount: number;
}

export interface TenantListResponse {
  totalElements: number;
  page: number;
  size: number;
  content: TenantSummary[];
}

export interface CreateTenantRequest {
  id: string;
  name: string;
  domain?: string;
  adminUsername: string;
  adminEmail?: string;
  adminFullName?: string;
  adminPassword?: string;
}

export interface CreateTenantResponse {
  tenant: TenantSummary;
  adminUsername: string;
  /** Shown once when adminPassword was omitted in CreateTenantRequest */
  temporaryPassword: string | null;
}

/**
 * Verified against SubscriptionUpdateRequest.java:6 and TenantProvisioningService.java:38
 * PATCH /api/v1/platform/admin/tenants/{id}/subscription expects `{ status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' }`.
 */
export interface SubscriptionUpdateRequest {
  status: TenantSubscriptionStatus;
}

export interface GlobalUserSummary {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface GlobalUserListResponse {
  totalElements: number;
  page: number;
  size: number;
  content: GlobalUserSummary[];
}

export interface CreateGlobalUserRequest {
  username: string;
  email: string;
  password: string;
}

export interface AdminUserSummary {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: Exclude<UserRole, 'SUPER_ADMIN'>;
  active: boolean;
  createdAt: string;
}

export interface UserListResponse {
  totalElements: number;
  page: number;
  size: number;
  content: AdminUserSummary[];
}

export interface PatchUserRequest {
  active?: boolean;
  fullName?: string;
  email?: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

// ---------------------------------------------------------------------------
// 3. Exam, Classroom, Subject & Rule Contracts (exam-service :8082)
// ---------------------------------------------------------------------------

export interface SubjectResponse {
  id: string;
  name: string;
  createdAt: string;
}

export interface SubjectRequest {
  name: string;
}

export interface SubjectTopicResponse {
  id: string;
  subjectId: string;
  name: string;
  code: string;
  orderIndex: number;
  createdAt: string;
}

export interface CreateSubjectTopicRequest {
  name: string;
  code?: string;
  orderIndex?: number;
}

export interface UpdateSubjectTopicRequest {
  name?: string;
  code?: string;
  orderIndex?: number;
}

export interface ExamTypeSubjectRuleResponse {
  examType: string;
  subjectId: string;
  subjectName: string | null;
  questionCount: number;
  penaltyDivisor: number;
}

export interface ExamTypeSubjectRuleRequest {
  questionCount: number;
  penaltyDivisor?: number;
}

export interface ExamResponse {
  id: string;
  title: string;
  examDate: string;
  examType: string;
  status: ExamStatus;
  finalizedAt: string | null;
  subjects: SubjectResponse[];
  classroomIds: string[];
  createdAt: string;
}

export interface ExamCreateRequest {
  title: string;
  examDate: string;
  examType: string;
}

export interface ExamUpdateRequest {
  title?: string;
  examDate?: string;
  examType?: string;
}

export interface AssignClassroomRequest {
  classroomId: string;
}

export interface ExamClassroomAssignment {
  classroomId?: string;
  classroom_id?: string;
  name?: string;
  assignedAt?: string;
  assigned_at?: string;
}

export interface SubjectInputDto {
  subjectId: string;
  correctCount: number;
  wrongCount: number;
}

export interface ExamResultSubmitRequest {
  subjects: SubjectInputDto[];
}

export interface RejectionRequest {
  reason: string;
}

export interface StudentExamResult {
  id: string;
  studentId: string;
  totalScore: number;
  classRank: number | null;
  schoolRank: number | null;
  percentile: number | null;
  status: ResultStatus;
  entryMethod: EntryMethod;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

/**
 * Verified against ClassroomService.java:35-60 (`SELECT id, name, created_at FROM %s.classrooms`)
 */
export interface ClassroomResponse {
  id: string;
  name: string;
  created_at?: string;
}

/**
 * Verified against CreateClassroomRequest.java:6-8
 */
export interface CreateClassroomRequest {
  name: string;
}

export interface AddMemberRequest {
  userId: string;
}

// ---------------------------------------------------------------------------
// 4. Student Portal, Dashboard, AI Report & Share Contracts
// ---------------------------------------------------------------------------

export interface StudentHomeLatestExamDto {
  examId: string;
  title: string;
  examDate: string;
  netScore: number;
  percentile: number | null;
}

export interface StudentBadgeDto {
  code: string;
  title: string;
  description: string | null;
  examTitle: string | null;
  awardedAt: string;
}

export interface StudentHomeResponseDto {
  studentName: string;
  classroomName: string | null;
  latestExam: StudentHomeLatestExamDto | null;
  recentBadges: StudentBadgeDto[];
}

export interface TopStudentDto {
  rank: number;
  displayName: string | null;
  maskedName?: string;
  studentId?: string;
  netScore: number;
}

export interface StudentDashboardResponse {
  classRank: number | null;
  schoolRank: number | null;
  netScore: number;
  percentile: number | null;
  classAverage: number | null;
  top3Students: TopStudentDto[];
}

export interface TrendDataPointDto {
  examId: string;
  examName: string;
  examDate: string;
  netScore: number;
  percentile: number | null;
}

export interface SubjectNetScoreDto {
  subjectId: string;
  subjectName: string;
  correctCount: number;
  wrongCount: number;
  netScore: number;
}

export interface ExamPerformanceDto {
  examId: string;
  examTitle: string;
  examType: string;
  examDate: string;
  totalScore: number;
  classRank: number | null;
  schoolRank: number | null;
  subjectScores: SubjectNetScoreDto[];
}

export interface StudentTrendReportDto {
  studentId: string;
  totalExamsTaken: number;
  examHistory: ExamPerformanceDto[];
}

export interface ShareLinkResponse {
  token: string;
}

/**
 * Contract for AI Report status & Markdown summary.
 * NOTE: s3Key is a synthetic backend string — never treat it as a downloadable URL.
 */
export interface AiReportResponseDto {
  id: string;
  status: AiReportStatus;
  summary: string | null;
  s3Key: string | null;
  requestedAt: string;
  completedAt: string | null;
}

// ---------------------------------------------------------------------------
// 5. Teacher Analytics, Observations & Admin RAG Contracts
// ---------------------------------------------------------------------------

export interface ObservationResponse {
  id: string;
  teacherId: string;
  classroomId: string | null;
  subjectId: string | null;
  examId: string | null;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Verified against CreateObservationRequest.java:11-24
 */
export interface CreateObservationRequest {
  content: string;
  subjectId?: string;
  examId?: string;
  tags?: string[];
}

export interface UpdateObservationRequest {
  content?: string;
  tags?: string[];
}

export interface ClassroomAdminSummary {
  classroomId: string;
  classroomName: string;
  latestExamId: string | null;
  latestExamTitle: string | null;
  latestExamDate: string | null;
  avgNet: number | null;
  participationRate: number | null;
  bestSubjectName: string | null;
  bestSubjectNet: number | null;
  worstSubjectName: string | null;
  worstSubjectNet: number | null;
  upTrendCount: number;
  downTrendCount: number;
  stableTrendCount: number;
}

export interface AdminDashboardResponse {
  classroomCount: number;
  classrooms: ClassroomAdminSummary[];
}

export interface ExamSummaryDto {
  id: string;
  title: string;
  examDate: string;
  examType: string;
}

export interface ClassSubjectAverageDto {
  subjectId: string;
  subjectName: string;
  avgNet: number;
  avgCorrect: number;
  avgWrong: number;
  // Aliases for convenience in charts
  averageNet?: number;
  averageCorrect?: number;
  averageWrong?: number;
}

export interface ClassExamTrendDto {
  examId: string;
  examTitle: string;
  examDate: string;
  avgScore: number;
  studentCount: number;
  // Aliases for convenience
  averageScore?: number;
  participantCount?: number;
}

export interface ClassroomAnalyticsResponse {
  classroomId: string;
  classroomName: string;
  totalStudents: number;
  analyzedExam: ExamSummaryDto | null;
  participationCount: number;
  participationRate: number;
  classAverageScore: number;
  subjectAverages: ClassSubjectAverageDto[];
  recentExamTrends: ClassExamTrendDto[];
}

export interface ClassroomComparisonItemDto {
  classroomId: string;
  classroomName: string;
  totalStudents: number;
  participationCount: number;
  avgScore: number;
  subjectNets: ClassSubjectAverageDto[];
  // Convenience fields for comparison tables
  studentCount?: number;
  participantCount?: number;
  participationRate?: number;
  averageScore?: number;
}

export interface ClassroomComparisonResponse {
  examId: string;
  examTitle: string;
  examDate: string;
  classrooms: ClassroomComparisonItemDto[];
}

export interface ClassSubjectTrendRow {
  classroomName: string;
  subjectName: string;
  examTitle: string;
  examDate: string;
  avgNet: number;
  deltaFromPrevious: number | null;
  trendDirection: string;
}

export interface RecentObservationDto {
  observationId: string;
  classroomName: string;
  subjectName: string | null;
  teacherRef: string;
  tags: string | null;
  content: string;
  observedAt: string;
}

export interface SubjectScorecardRow {
  subjectId: string;
  subjectName: string;
  classroomCount: number;
  avgNet: number;
  minNet: number;
  maxNet: number;
  bestClassroomName: string | null;
  worstClassroomName: string | null;
}

export interface SubjectScorecardResponse {
  examId: string;
  subjects: SubjectScorecardRow[];
}

/**
 * Verified against AdminChatRequest.java:11 (POST /api/v1/admin/ai/chat)
 */
export interface AdminChatRequest {
  message: string;
  classroomId?: string;
  subjectId?: string;
  examId?: string;
}

export interface ChatSource {
  sourceType: string;
  sourceId: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

/**
 * Verified against AdminChatResponse.java:13
 */
export interface AdminChatResponse {
  answer: string;
  sources: ChatSource[];
}

/**
 * Verified against RagAdminController.java:44-47 (POST /api/v1/admin/ai/rag/backfill)
 */
export interface RagBackfillResponse {
  candidates: number;
  updated: number;
  failed: number;
}
