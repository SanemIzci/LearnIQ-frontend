import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Database,
  Filter,
  Loader2,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/error-parser';
import { useAdminChatMutation } from '../api/aiRagApi';
import { ChatSourceCard } from '../components/ChatSourceCard';
import { RagBackfillCard } from '../components/RagBackfillCard';
import {
  useAnalyticsClassroomsQuery,
  useAnalyticsExamsQuery,
  useAnalyticsSubjectsQuery,
} from '@/features/analytics/api/analyticsApi';
import { useAppSelector } from '@/store';
import type { ChatSource } from '@/types/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  timestamp: string;
}

const SAMPLE_PROMPTS = [
  '12-A sınıfının son denemedeki matematik net ortalaması ve zayıf konuları nelerdir?',
  'Tüm sınıflar genelinde katılım oranı en düşük olan sınav hangisidir?',
  'Türkçe dersinde başarı düşüşü yaşayan öğrenciler ve tespit edilen ortak konular nelerdir?',
];

export function AdminAiAssistantPage() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const canAccess = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = React.useState('');
  const [selectedClassroomId, setSelectedClassroomId] = React.useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>('');
  const [selectedExamId, setSelectedExamId] = React.useState<string>('');
  const [showBackfillCard, setShowBackfillCard] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const classroomsQuery = useAnalyticsClassroomsQuery();
  const subjectsQuery = useAnalyticsSubjectsQuery();
  const examsQuery = useAnalyticsExamsQuery();

  const chatMutation = useAdminChatMutation();

  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, chatMutation.isPending]);

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-2xl py-12" role="alert">
        <Alert variant="destructive" title="Yetkisiz Erişim">
          Bu sayfaya yalnızca kurum yöneticileri (ADMIN) ve platform yöneticileri (SUPER_ADMIN) erişebilir.
        </Alert>
      </div>
    );
  }

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend !== undefined ? textToSend : inputMessage;
    const trimmed = rawText.trim();
    if (!trimmed || chatMutation.isPending) return;

    if (trimmed.length > 4000) {
      setErrorMessage('Soru metni 4000 karakterden uzun olamaz.');
      return;
    }

    setErrorMessage(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');

    try {
      const response = await chatMutation.mutateAsync({
        message: trimmed,
        classroomId: selectedClassroomId || undefined,
        subjectId: selectedSubjectId || undefined,
        examId: selectedExamId || undefined,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('AI Asistanı yanıt verirken bir hata oluştu. Lütfen tekrar deneyiniz.');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setErrorMessage(null);
  };

  const handleClearFilters = () => {
    setSelectedClassroomId('');
    setSelectedSubjectId('');
    setSelectedExamId('');
  };

  const hasActiveFilters = Boolean(
    selectedClassroomId || selectedSubjectId || selectedExamId
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Admin RAG AI Asistanı
            </h1>
            <Badge variant="outline" className="ml-1 text-xs font-mono">
              Kurum Bilgi Bankası
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Kurum sınav sonuçları, konu zayıflıkları ve öğretmen gözlemleri üzerinde semantik
            RAG araması yapın.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowBackfillCard(!showBackfillCard)}
            className="gap-1.5"
            aria-expanded={showBackfillCard}
          >
            <Database className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Vektör Senkronizasyonu (Backfill)</span>
            {showBackfillCard ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </Button>

          {messages.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearChat}
              className="gap-1.5 text-muted-foreground hover:text-destructive"
              aria-label="Sohbet geçmişini temizle"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span>Temizle</span>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Collapsible Backfill Tool */}
      {showBackfillCard ? (
        <div className="transition-all animate-in fade-in slide-in-from-top-2">
          <RagBackfillCard />
        </div>
      ) : null}

      {/* Context Filters Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <CardTitle as="h2" className="text-sm font-semibold">
                Soru Bağlam Filtreleri (Opsiyonel)
              </CardTitle>
            </div>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Filtreleri Temizle
              </Button>
            ) : null}
          </div>
          <CardDescription className="text-xs">
            Sorunuzu belirli bir sınıf, ders veya sınav bağlamında sınırlandırarak daha odaklı
            semantik yanıtlar alabilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="ai-classroom-filter" className="text-xs">
                Hedef Sınıf
              </Label>
              <Select
                id="ai-classroom-filter"
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
                disabled={chatMutation.isPending}
                className="text-xs"
              >
                <option value="">Tüm Kurum Sınıfları</option>
                {(classroomsQuery.data || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="ai-subject-filter" className="text-xs">
                Hedef Ders
              </Label>
              <Select
                id="ai-subject-filter"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={chatMutation.isPending}
                className="text-xs"
              >
                <option value="">Tüm Dersler</option>
                {(subjectsQuery.data || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="ai-exam-filter" className="text-xs">
                Hedef Sınav
              </Label>
              <Select
                id="ai-exam-filter"
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                disabled={chatMutation.isPending}
                className="text-xs"
              >
                <option value="">Tüm Sınavlar</option>
                {(examsQuery.data || []).map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} ({ex.examType})
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat Container */}
      <Card className="shadow-sm border flex flex-col min-h-[520px]">
        {/* Messages Stream */}
        <div
          role="log"
          aria-live="polite"
          aria-label="AI Sohbet Akışı"
          className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[580px]"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Bot className="h-10 w-10 text-primary" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                LearnIQ Bilgi Bankasına Sorun
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mt-1 mb-6">
                Kurumunuzun sınav geçmişi, sınıf netleri, konu başarı tablosu ve öğretmen
                gözlemleri hakkında soru sorabilirsiniz.
              </p>

              <div className="w-full max-w-lg space-y-2 text-left">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Örnek Sorular:
                </p>
                {SAMPLE_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="w-full text-left rounded-lg border bg-card p-3 text-xs text-foreground hover:bg-muted/50 hover:border-primary/50 transition-colors shadow-sm flex items-start gap-2"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-4 w-4" aria-hidden="true" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 space-y-2 text-sm ${
                      isUser
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-muted/40 border border-border/70 rounded-bl-none text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 text-[10px] opacity-75 pb-1 border-b border-current/10">
                      <span className="font-semibold">
                        {isUser ? 'Yönetici' : 'LearnIQ Asistanı'}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    {isUser ? (
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm break-words leading-relaxed space-y-2">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}

                    {!isUser && msg.sources && msg.sources.length > 0 ? (
                      <ChatSourceCard sources={msg.sources} />
                    ) : null}
                  </div>

                  {isUser && (
                    <div className="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-4 w-4" aria-hidden="true" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Assistant Loading State */}
          {chatMutation.isPending && (
            <div className="flex gap-3 justify-start items-center text-muted-foreground text-xs py-2">
              <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              </div>
              <div className="rounded-2xl bg-muted/40 border px-4 py-3 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span>RAG dokümanları taranıyor ve yanıt üretiliyor...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t bg-card rounded-b-xl space-y-3">
          {errorMessage ? (
            <div role="alert" aria-live="polite">
              <Alert variant="destructive" title="İşlem Hatası">
                {errorMessage}
              </Alert>
            </div>
          ) : null}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            method="post"
            noValidate
            className="space-y-2"
          >
            <div className="relative">
              <label htmlFor="ai-chat-input" className="sr-only">
                Yapay zekaya soru sorun
              </label>
              <textarea
                id="ai-chat-input"
                rows={2}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={chatMutation.isPending}
                placeholder="Kurum sınavları, sınıf başarıları veya öğrenci gözlemleri hakkında sorunuzu yazın... (Enter ile gönderin, Shift+Enter yeni satır)"
                maxLength={4000}
                aria-label="Yapay zekaya soru sorun"
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 pr-20 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="absolute right-2 bottom-2.5 flex items-center gap-1.5">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!inputMessage.trim() || chatMutation.isPending}
                  className="h-8 px-3 gap-1.5"
                  aria-label="Soruyu Gönder"
                >
                  {chatMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span className="hidden sm:inline">Gönder</span>
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>Enter tuşu ile gönderin, yeni satır için Shift+Enter kullanın.</span>
              <span className={inputMessage.length > 3900 ? 'text-destructive font-bold' : ''}>
                {inputMessage.length} / 4000
              </span>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
