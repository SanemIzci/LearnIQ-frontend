export { ExamsPage } from './pages/ExamsPage';
export { ExamDetailPage } from './pages/ExamDetailPage';
export { CreateExamDialog } from './components/CreateExamDialog';
export { EditExamDialog } from './components/EditExamDialog';
export { DeleteExamDialog } from './components/DeleteExamDialog';
export { ExamSubjectsDialog } from './components/ExamSubjectsDialog';
export { ExamClassroomsDialog } from './components/ExamClassroomsDialog';
export { FinalizeExamDialog } from './components/FinalizeExamDialog';
export { RejectResultDialog } from './components/RejectResultDialog';
export {
  examsApi,
  useExamsQuery,
  useExamDetailQuery,
  useExamResultsQuery,
  useSubjectsQuery,
  useClassroomsQuery,
  type ExamsQueryParams,
  type ExamResultsQueryParams,
} from './api/examsApi';
export {
  createExamSchema,
  updateExamSchema,
  rejectResultSchema,
  type CreateExamFormValues,
  type UpdateExamFormValues,
  type RejectResultFormValues,
} from './schemas/examSchemas';

