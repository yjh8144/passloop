import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, MutableRefObject } from "react";
import {
  BookOpen,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  Edit3,
  FileJson,
  Languages,
  Moon,
  Plus,
  Eraser,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
  Shuffle,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type {
  AppData,
  ChoiceOption,
  LlmConfig,
  PracticeMode,
  Question,
  QuestionList,
  QuestionType,
  SubmitMode,
  Toast,
  ViewMode,
} from "./lib/types";
import { getTranslator } from "./lib/i18n";
import {
  clearLlmConfig,
  createDefaultData,
  createEmptyQuestionList,
  downloadJson,
  loadData,
  loadLlmConfig,
  normalizeAppData,
  readFileAsText,
  saveLlmConfig,
  saveData,
} from "./lib/storage";
import {
  createEmptyQuestion,
  createId,
  formatAnswer,
  getListStats,
  isAnswerCorrect,
  normalizeImportedList,
  normalizeQuestion,
  parseQuestionJson,
  sortQuestions,
  toArray,
  typeLabels,
} from "./lib/question";
import { parseWithLlm, streamParseLlm, testLlmConnection, fetchModelList, extractJsonText, fillAnswersWithLlm } from "./lib/llm";
import { isDebugEnabled, setDebugEnabled, debugLog } from "./lib/debug";

type Page = "practice" | "manager" | "llm" | "wrong";
type AnswerMap = Record<string, string | string[]>;
type ResultMap = Record<string, boolean>;
type WrongSession = {
  id: string;
  startedAt: number;
  elapsedSeconds: number;
  submitted: number;
  correct: number;
};

const questionTypes: QuestionType[] = [
  "single",
  "multiple",
  "boolean",
  "blank",
  "short",
  "composite",
];

const providerPlaceholders: Record<LlmConfig["provider"], { endpoint: string; model: string }> = {
  openai: { endpoint: "https://api.openai.com/v1/chat/completions", model: "gpt-4.1-mini" },
  anthropic: { endpoint: "https://api.anthropic.com/v1/messages", model: "claude-3-5-sonnet-latest" },
  gemini: { endpoint: "https://generativelanguage.googleapis.com/v1beta/models/...", model: "gemini-1.5-pro" },
  custom: { endpoint: "https://your-api.example.com/v1/chat/completions", model: "" },
};

const defaultLlmConfig: LlmConfig = {
  provider: "openai",
  endpoint: "",
  apiKey: "",
  model: "",
  fillAnswer: true,
  fillExplanation: true,
};

function ResetConfirmDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>清除所有数据</h2>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        <p style={{ margin: "8px 0 12px", lineHeight: 1.6 }}>
          此操作会清空浏览器中的所有题单、答题记录和配置，且不可恢复。请输入「确认」以继续。
        </p>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && value.trim() === "确认") onConfirm(); }}
          placeholder="请输入「确认」"
        />
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button
            style={{ background: "var(--danger)", color: "#fff", borderColor: "var(--danger)" }}
            disabled={value.trim() !== "确认"}
            onClick={onConfirm}
          >
            清除所有数据
          </button>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [page, setPage] = useState<Page>("practice");
  const [query, setQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [results, setResults] = useState<ResultMap>({});
  const [editing, setEditing] = useState<Question | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [wrongSession, setWrongSession] = useState<WrongSession | null>(null);
  const [mobileSidebarCollapsed, setMobileSidebarCollapsed] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);
  const [promptDialog, setPromptDialog] = useState<PromptDialogState>(null);
  const [resetConfirmDialog, setResetConfirmDialog] = useState(false);
  const startedAtRef = useRef<Record<string, number>>({});
  const llmUnsavedRef = useRef(false);
  const t = getTranslator(data.settings.language);

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ message, onConfirm });
  };

  const showPrompt = (title: string, defaultValue: string, onSubmit: (value: string) => void) => {
    setPromptDialog({ title, defaultValue, onSubmit });
  };

  const activeList = useMemo(
    () => data.lists.find((list) => list.id === data.activeListId) ?? data.lists[0],
    [data.activeListId, data.lists],
  );

  const stats = useMemo(
    () => getListStats(activeList, data.attempts),
    [activeList, data.attempts],
  );

  const displayedQuestions = useMemo(() => {
    const sorted = sortQuestions(activeList.questions, data.settings.sortMode);
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return sorted;
    return sorted.filter((question) =>
      [question.title, question.prompt, typeLabels[question.type]]
        .join(" ")
        .toLowerCase()
        .includes(trimmed),
    );
  }, [activeList.questions, data.settings.sortMode, query]);

  const wrongQuestions = useMemo(
    () => activeList.questions.filter((question) => stats.wrongQuestionIds.has(question.id)),
    [activeList.questions, stats.wrongQuestionIds],
  );

  useEffect(() => saveData(data), [data]);

  useEffect(() => {
    const body = document.body;
    body.dataset.theme = data.settings.theme;
    body.dataset.language = data.settings.language;
  }, [data.settings.theme, data.settings.language]);

  useEffect(() => {
    setCurrentIndex((index) => Math.min(index, Math.max(displayedQuestions.length - 1, 0)));
  }, [displayedQuestions.length]);

  useEffect(() => {
    if (page !== "wrong" || !wrongSession) return;
    const intervalId = window.setInterval(() => {
      setWrongSession((session) =>
        session
          ? {
              ...session,
              elapsedSeconds: Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000)),
            }
          : session,
      );
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [page, wrongSession?.id]);

  useEffect(() => {
    if (page === "wrong") startWrongPractice();
  }, [activeList.id]);

  const pushToast = (tone: Toast["tone"], message: string) => {
    const id = createId();
    setToasts((items) => [...items, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
    }, 3200);
  };

  const updateData = (recipe: (draft: AppData) => AppData) => {
    setData((current) => recipe(current));
  };

  const updateSettings = (patch: Partial<AppData["settings"]>) => {
    debugLog("Settings updated", patch);
    updateData((current) => ({
      ...current,
      settings: { ...current.settings, ...patch },
    }));
  };

  const updateActiveList = (recipe: (list: QuestionList) => QuestionList) => {
    updateData((current) => ({
      ...current,
      lists: current.lists.map((list) =>
        list.id === current.activeListId ? recipe(list) : list,
      ),
    }));
  };

  const handleQuestionImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const lists = parseQuestionJson(await readFileAsText(file));
      debugLog("Question import", { fileName: file.name, listCount: lists.length, totalQuestions: lists.reduce((sum, l) => sum + l.questions.length, 0) });
      updateData((current) => ({
        ...current,
        lists: [...current.lists, ...lists],
        activeListId: lists[0]?.id ?? current.activeListId,
      }));
      pushToast("success", `已导入 ${lists.length} 个题单。`);
    } catch (error) {
      debugLog("Question import failed", error);
      pushToast("error", error instanceof Error ? error.message : "导入失败。");
    }
  };

  const handleBackupImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    showConfirm("导入缓存备份会覆盖当前浏览器中的题单、记录和配置。确定继续吗？", async () => {
      try {
        const imported = normalizeAppData(JSON.parse(await readFileAsText(file)));
        setData(imported);
        pushToast("success", "缓存备份已恢复。");
      } catch {
        pushToast("error", "缓存备份不是有效的 PassLoop 数据。");
      }
    });
  };

  const createList = () => {
    showPrompt("题单名称", `题单 ${data.lists.length + 1}`, (name) => {
      debugLog("Create list", { name });
      const list = createEmptyQuestionList(name);
      updateData((current) => ({
        ...current,
        lists: [...current.lists, list],
        activeListId: list.id,
      }));
    });
  };

  const deleteList = (id: string) => {
    showConfirm("删除题单会同时移除其中题目和该题单刷题数据。确定删除吗？", () => {
      debugLog("Delete list", { id });
      updateData((current) => {
        const remaining = current.lists.filter((list) => list.id !== id);
        const lists = remaining.length ? remaining : [createEmptyQuestionList("默认题单")];
        return {
          ...current,
          lists,
          activeListId: current.activeListId === id ? lists[0].id : current.activeListId,
          attempts: current.attempts.filter((attempt) => attempt.listId !== id),
        };
      });
      setCurrentIndex(0);
      setAnswers({});
      setResults({});
      setWrongSession(null);
      startedAtRef.current = {};
      pushToast("success", "题单已删除。");
    });
  };

  const clearActiveListAttempts = () => {
    showConfirm(`确定清空「${activeList.name}」的刷题数据吗？题目内容会保留。`, () => {
      debugLog("Clear list attempts", { listId: activeList.id, listName: activeList.name });
      const activeQuestionIds = new Set(activeList.questions.map((question) => question.id));
      const activeSubQuestionIds = new Set(
        activeList.questions.flatMap((question) => question.subQuestions.map((subQuestion) => subQuestion.id)),
      );
      updateData((current) => ({
        ...current,
        attempts: current.attempts.filter((attempt) => attempt.listId !== activeList.id),
      }));
      setCurrentIndex(0);
      setResults((current) => {
        const next = { ...current };
        for (const id of activeQuestionIds) delete next[id];
        for (const id of activeSubQuestionIds) delete next[id];
        return next;
      });
      setAnswers((current) => {
        const next = { ...current };
        for (const id of activeQuestionIds) delete next[id];
        for (const id of activeSubQuestionIds) delete next[id];
        return next;
      });
      for (const id of activeQuestionIds) delete startedAtRef.current[id];
      for (const id of activeSubQuestionIds) delete startedAtRef.current[id];
      setWrongSession(null);
      if (page === "wrong") setPage("practice");
      pushToast("success", "当前题单刷题数据已清空。");
    });
  };

  const startWrongPractice = () => {
    if (!wrongQuestions.length) {
      pushToast("info", "当前题单还没有错题。");
      return false;
    }
    debugLog("Wrong practice started", { questionCount: wrongQuestions.length, listId: activeList.id });
    const startedAt = Date.now();
    setWrongSession({
      id: createId(),
      startedAt,
      elapsedSeconds: 0,
      submitted: 0,
      correct: 0,
    });
    setPage("wrong");
    setCurrentIndex(0);
    setResults({});
    setAnswers((current) => {
      const next = { ...current };
      for (const question of wrongQuestions) {
        delete next[question.id];
        for (const subQuestion of question.subQuestions) delete next[subQuestion.id];
      }
      return next;
    });
    for (const question of wrongQuestions) {
      delete startedAtRef.current[question.id];
      for (const subQuestion of question.subQuestions) delete startedAtRef.current[subQuestion.id];
    }
    return true;
  };

  const changePage = (nextPage: Page) => {
    debugLog("Page changed", { from: page, to: nextPage });
    if (page === "llm" && nextPage !== "llm" && llmUnsavedRef.current) {
      showConfirm("LLM 解析结果尚未导出或导入，离开页面后数据将丢失。确定离开吗？", () => {
        llmUnsavedRef.current = false;
        if (nextPage === "wrong") {
          startWrongPractice();
        } else {
          setPage(nextPage);
        }
      });
      return;
    }
    if (nextPage === "wrong") {
      startWrongPractice();
      return;
    }
    setPage(nextPage);
  };

  const submitQuestion = (question: Question) => {
    const startedAt = startedAtRef.current[question.id] ?? Date.now();
    const correct = evaluateQuestion(question, answers);
    debugLog("Question submitted", { questionId: question.id, title: question.title, correct, elapsedMs: Date.now() - startedAt, answer: answers[question.id] });
    setResults((current) => ({ ...current, [question.id]: correct }));
    if (page === "wrong") {
      setWrongSession((session) =>
        session
          ? {
              ...session,
              elapsedSeconds: Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000)),
              submitted: session.submitted + 1,
              correct: session.correct + (correct ? 1 : 0),
            }
          : session,
      );
    }
    updateData((current) => ({
      ...current,
      attempts: [
        ...current.attempts,
        {
          id: createId(),
          listId: activeList.id,
          questionId: question.id,
          answer: answers[question.id] ?? collectCompositeAnswer(question, answers),
          correct,
          elapsedMs: Math.max(1000, Date.now() - startedAt),
          submittedAt: new Date().toISOString(),
        },
      ],
    }));
    pushToast(correct ? "success" : "info", correct ? "回答正确。" : "已记录为错题。");
    if (data.settings.autoNext) {
      const questions = page === "wrong" ? wrongQuestions : displayedQuestions;
      if (data.settings.viewMode === "single") {
        const questionCount = questions.length;
        if (currentIndex < questionCount - 1) {
          window.setTimeout(() => setCurrentIndex((index) => Math.min(index + 1, questionCount - 1)), 500);
        }
      } else if (data.settings.viewMode === "paper") {
        const questionIndex = questions.findIndex((q) => q.id === question.id);
        if (questionIndex >= 0 && questionIndex < questions.length - 1) {
          window.setTimeout(() => {
            const el = document.getElementById(`question-${questionIndex + 1}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 500);
        }
      }
    }
  };

  const submitAll = () => {
    const questions = page === "wrong" ? wrongQuestions : displayedQuestions;
    const unsubmitted = questions.filter((q) => !(q.id in results));
    if (!unsubmitted.length) return;
    debugLog("Submit all", { totalQuestions: questions.length, unsubmittedCount: unsubmitted.length });
    let correctCount = 0;
    const newAttempts: AppData["attempts"] = [];
    const newResults: ResultMap = {};
    for (const question of unsubmitted) {
      const startedAt = startedAtRef.current[question.id] ?? Date.now();
      const correct = evaluateQuestion(question, answers);
      newResults[question.id] = correct;
      if (correct) correctCount++;
      newAttempts.push({
        id: createId(),
        listId: activeList.id,
        questionId: question.id,
        answer: answers[question.id] ?? collectCompositeAnswer(question, answers),
        correct,
        elapsedMs: Math.max(1000, Date.now() - startedAt),
        submittedAt: new Date().toISOString(),
      });
    }
    setResults((current) => ({ ...current, ...newResults }));
    updateData((current) => ({
      ...current,
      attempts: [...current.attempts, ...newAttempts],
    }));
    if (page === "wrong") {
      setWrongSession((session) =>
        session
          ? {
              ...session,
              elapsedSeconds: Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000)),
              submitted: session.submitted + unsubmitted.length,
              correct: session.correct + correctCount,
            }
          : session,
      );
    }
    pushToast("success", `已提交 ${unsubmitted.length} 题，正确 ${correctCount} 题。`);
  };

  const resetWrongPractice = () => {
    startWrongPractice();
  };

  const exportWrongList = () => {
    if (!wrongQuestions.length) {
      pushToast("info", "当前题单还没有错题。");
      return;
    }
    debugLog("Export wrong questions", { count: wrongQuestions.length, listName: activeList.name });
    const list = normalizeImportedList({
      name: `${activeList.name} - 错题`,
      description: "由 PassLoop 根据答题记录导出的错题题单。",
      questions: wrongQuestions,
    });
    downloadJson(`${list.name}.json`, list);
  };

  const addImportedList = (list: QuestionList) => {
    debugLog("Add imported list", { name: list.name, questionCount: list.questions.length });
    updateData((current) => ({
      ...current,
      lists: [...current.lists, list],
      activeListId: list.id,
    }));
    pushToast("success", "已导入到本地题单。");
  };

  const resetAll = () => {
    setResetConfirmDialog(true);
  };

  const practiceQuestions = page === "wrong" ? wrongQuestions : displayedQuestions;

  return (
    <div className={`app-shell ${desktopSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        t={t}
        page={page}
        setPage={changePage}
        data={data}
        activeList={activeList}
        setData={setData}
        createList={createList}
        onQuestionImport={handleQuestionImport}
        onBackupImport={handleBackupImport}
        onExportList={() => downloadJson(`${activeList.name}.json`, activeList)}
        onExportBackup={() => downloadJson("passloop-cache-backup.json", data)}
        onResetAll={resetAll}
        collapsed={mobileSidebarCollapsed}
        onToggleCollapsed={() => setMobileSidebarCollapsed((collapsed) => !collapsed)}
        desktopCollapsed={desktopSidebarCollapsed}
        onToggleDesktopCollapsed={() => setDesktopSidebarCollapsed((c) => !c)}
      />

      <main className="workspace">
        <Topbar
          t={t}
          page={page}
          query={query}
          setQuery={setQuery}
          data={data}
          updateSettings={updateSettings}
          activeList={activeList}
          onRedoWrong={resetWrongPractice}
          onExportWrong={exportWrongList}
        />

        {page === "manager" ? (
          <ManagerPage
            t={t}
            list={activeList}
            updateList={updateActiveList}
            editing={editing}
            setEditing={setEditing}
            pushToast={pushToast}
            showConfirm={showConfirm}
            showPrompt={showPrompt}
            onClearListAttempts={clearActiveListAttempts}
            onDeleteList={() => deleteList(activeList.id)}
          />
        ) : page === "llm" ? (
          <LlmPage
            t={t}
            activeList={activeList}
            updateActiveList={updateActiveList}
            addImportedList={addImportedList}
            pushToast={pushToast}
            unsavedRef={llmUnsavedRef}
          />
        ) : (
          <PracticePage
            t={t}
            mode={page}
            questions={practiceQuestions}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            answers={answers}
            setAnswers={setAnswers}
            results={results}
            submitQuestion={submitQuestion}
            submitAll={submitAll}
            settings={data.settings}
            updateSettings={updateSettings}
            stats={stats}
            wrongSession={page === "wrong" ? wrongSession : null}
            startedAtRef={startedAtRef}
          />
        )}
      </main>

      <ToastStack toasts={toasts} />
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(null)} />
      <PromptDialog state={promptDialog} onClose={() => setPromptDialog(null)} />
      <ResetConfirmDialog
        open={resetConfirmDialog}
        onClose={() => setResetConfirmDialog(false)}
        onConfirm={() => {
          debugLog("Reset all data");
          clearLlmConfig();
          setData(createDefaultData());
          setAnswers({});
          setResults({});
          setResetConfirmDialog(false);
        }}
      />
    </div>
  );
}

function Sidebar(props: {
  t: (key: string) => string;
  page: Page;
  setPage: (page: Page) => void;
  data: AppData;
  activeList: QuestionList;
  setData: (data: AppData | ((data: AppData) => AppData)) => void;
  createList: () => void;
  onQuestionImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onBackupImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onExportList: () => void;
  onExportBackup: () => void;
  onResetAll: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  desktopCollapsed: boolean;
  onToggleDesktopCollapsed: () => void;
}) {
  const { t } = props;
  const clickTimesRef = useRef<number[]>([]);
  const [showDebugDialog, setShowDebugDialog] = useState(false);
  const [debugEnabled, setDebugState] = useState(() => isDebugEnabled());

  const handleBrandClick = useCallback(() => {
    const now = Date.now();
    clickTimesRef.current.push(now);
    clickTimesRef.current = clickTimesRef.current.filter((ts) => now - ts < 3000);
    if (clickTimesRef.current.length >= 7) {
      clickTimesRef.current = [];
      setShowDebugDialog(true);
    }
  }, []);

  const toggleDebug = useCallback(() => {
    const next = !debugEnabled;
    setDebugEnabled(next);
    setDebugState(next);
    debugLog(next ? "Debug mode enabled" : "Debug mode disabled");
    setShowDebugDialog(false);
  }, [debugEnabled]);

  return (
    <aside className={`sidebar ${props.collapsed ? "is-collapsed" : ""} ${props.desktopCollapsed ? "desktop-collapsed" : ""}`}>
      <div className="brand">
        <div className="brand-mark" onClick={handleBrandClick}>P</div>
        <div className="brand-text">
          <strong>PassLoop</strong>
          <span>纯前端题库</span>
        </div>
        <button
          className="icon-button desktop-sidebar-toggle"
          title={props.desktopCollapsed ? "展开侧边栏" : "收起侧边栏"}
          onClick={props.onToggleDesktopCollapsed}
        >
          {props.desktopCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        <button
          className="icon-button mobile-sidebar-toggle"
          title={props.collapsed ? "展开题单栏" : "收起题单栏"}
          onClick={props.onToggleCollapsed}
        >
          {props.collapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
        </button>
      </div>

      <div className="sidebar-body">
        <nav className="nav-stack" aria-label="主导航">
          <button className={props.page === "practice" ? "active" : ""} onClick={() => props.setPage("practice")}>
            <BookOpen size={17} /> {t("dashboard")}
          </button>
          <button className={props.page === "manager" ? "active" : ""} onClick={() => props.setPage("manager")}>
            <Edit3 size={17} /> {t("manager")}
          </button>
          <button className={props.page === "llm" ? "active" : ""} onClick={() => props.setPage("llm")}>
            <BrainCircuit size={17} /> {t("llm")}
          </button>
          <button className={props.page === "wrong" ? "active" : ""} onClick={() => props.setPage("wrong")}>
            <Shuffle size={17} /> {t("wrong")}
          </button>
        </nav>

        <div className="sidebar-section">
          <div className="section-title">
            <span>题单</span>
            <button className="icon-button" title={t("addList")} onClick={props.createList}>
              <Plus size={16} />
            </button>
          </div>
          <div className="list-stack">
            {props.data.lists.map((list) => (
              <button
                key={list.id}
                className={`list-item ${list.id === props.activeList.id ? "active" : ""}`}
                onClick={() =>
                  props.setData((current) => ({ ...current, activeListId: list.id }))
                }
              >
                <span>{list.name}</span>
                <small>{list.questions.length} 题</small>
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-actions">
          <label className="file-action">
            <Upload size={16} /> {t("importQuestions")}
            <input type="file" accept=".json,application/json" onChange={props.onQuestionImport} />
          </label>
          <label className="file-action">
            <Upload size={16} /> {t("importBackup")}
            <input type="file" accept=".json,application/json" onChange={props.onBackupImport} />
          </label>
          <button onClick={props.onExportList}>
            <Download size={16} /> {t("exportList")}
          </button>
          <button onClick={props.onExportBackup}>
            <FileJson size={16} /> {t("exportBackup")}
          </button>
          <button className="danger-outline" onClick={props.onResetAll}>
            <Trash2 size={16} /> 清除所有数据
          </button>
        </div>
      </div>

      {showDebugDialog && (
        <div className="modal-overlay" onClick={() => setShowDebugDialog(false)}>
          <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Debug 模式</h2>
              <button className="icon-button" onClick={() => setShowDebugDialog(false)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: "8px 0 16px", lineHeight: 1.6 }}>
              {debugEnabled ? "Debug 模式已开启，控制台将输出日志。" : "Debug 模式已关闭。"}
            </p>
            <div className="modal-actions">
              <button onClick={() => setShowDebugDialog(false)}>取消</button>
              <button
                style={{ background: debugEnabled ? "var(--danger)" : "var(--accent)", color: "#fff", borderColor: debugEnabled ? "var(--danger)" : "var(--accent)" }}
                onClick={toggleDebug}
              >
                {debugEnabled ? "关闭 Debug" : "开启 Debug"}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function Topbar(props: {
  t: (key: string) => string;
  page: Page;
  query: string;
  setQuery: (value: string) => void;
  data: AppData;
  updateSettings: (patch: Partial<AppData["settings"]>) => void;
  activeList: QuestionList;
  onRedoWrong: () => void;
  onExportWrong: () => void;
}) {
  const [showSettings, setShowSettings] = useState(false);
  const showSearch = props.page === "practice" || props.page === "wrong";
  const showSettingsButton = props.page === "practice" || props.page === "wrong";
  return (
    <header className="topbar">
      {showSearch && (
        <div className="search-box">
          <Search size={17} />
          <input
            value={props.query}
            onChange={(event) => props.setQuery(event.target.value)}
            placeholder={props.t("questionSearch")}
          />
        </div>
      )}
      <div className="topbar-meta">
        <span>{props.activeList.name}</span>
        <span>{props.activeList.questions.length} 题</span>
      </div>
      <div className="topbar-actions">
        <label className="select-label">
          <Moon size={16} />
          <select
            value={props.data.settings.theme}
            onChange={(event) => props.updateSettings({ theme: event.target.value as AppData["settings"]["theme"] })}
          >
            <option value="mint">Mint</option>
            <option value="paper">Paper</option>
            <option value="lavender">Lavender</option>
            <option value="ocean">Ocean</option>
            <option value="rose">Rose</option>
            <option value="night">Night</option>
            <option value="nord">Nord</option>
          </select>
        </label>
        <label className="select-label">
          <Languages size={16} />
          <select
            value={props.data.settings.language}
            onChange={(event) => props.updateSettings({ language: event.target.value as AppData["settings"]["language"] })}
          >
            <option value="zh">中文</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
            <option value="fr">Français</option>
          </select>
        </label>
        {showSettingsButton && (
          <div className="topbar-settings-wrap">
            <button className="icon-button" title="刷题设置" onClick={() => setShowSettings((v) => !v)}>
              <Settings2 size={17} />
            </button>
            {showSettings && (
              <div className="topbar-settings-dropdown">
                <ControlPanel
                  t={props.t}
                  settings={props.data.settings}
                  updateSettings={props.updateSettings}
                  onRedoWrong={props.onRedoWrong}
                  onExportWrong={props.onExportWrong}
                />
              </div>
            )}
            {showSettings && <div className="topbar-settings-backdrop" onClick={() => setShowSettings(false)} />}
          </div>
        )}
      </div>
    </header>
  );
}

function PracticePage(props: {
  t: (key: string) => string;
  mode: Page;
  questions: Question[];
  currentIndex: number;
  setCurrentIndex: (value: number | ((value: number) => number)) => void;
  answers: AnswerMap;
  setAnswers: (value: AnswerMap | ((value: AnswerMap) => AnswerMap)) => void;
  results: ResultMap;
  submitQuestion: (question: Question) => void;
  submitAll: () => void;
  settings: AppData["settings"];
  updateSettings: (patch: Partial<AppData["settings"]>) => void;
  stats: ReturnType<typeof getListStats>;
  wrongSession: WrongSession | null;
  startedAtRef: MutableRefObject<Record<string, number>>;
}) {
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const activeQuestion = props.questions[props.currentIndex];
  useEffect(() => {
    if (activeQuestion && !props.startedAtRef.current[activeQuestion.id]) {
      props.startedAtRef.current[activeQuestion.id] = Date.now();
    }
  }, [activeQuestion, props.startedAtRef]);

  const content =
    props.questions.length === 0 ? (
      <EmptyState title="暂无题目" description="请先导入题库 JSON，或在题库管理中新增题目。" />
    ) : props.settings.viewMode === "paper" ? (
      <div className="paper-stack">
        {props.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            id={`question-${index}`}
            index={index}
            question={question}
            answers={props.answers}
            setAnswers={props.setAnswers}
            result={props.results[question.id]}
            submitted={question.id in props.results}
            practiceMode={props.settings.practiceMode}
            onSubmit={() => props.submitQuestion(question)}
            hideSubmit={props.settings.submitMode === "paper"}
          />
        ))}
        {props.settings.submitMode === "paper" && props.questions.some((q) => !(q.id in props.results)) && (
          <button className="submit-all-button" onClick={props.submitAll}>
            <Check size={18} /> 提交全部答案
          </button>
        )}
      </div>
    ) : (
      activeQuestion && (
        <QuestionCard
          index={props.currentIndex}
          question={activeQuestion}
          answers={props.answers}
          setAnswers={props.setAnswers}
          result={props.results[activeQuestion.id]}
          submitted={activeQuestion.id in props.results}
          practiceMode={props.settings.practiceMode}
          onSubmit={() => props.submitQuestion(activeQuestion)}
          onNext={props.currentIndex < props.questions.length - 1 ? () => props.setCurrentIndex((i) => i + 1) : undefined}
        />
      )
    );

  return (
    <div className={`practice-layout ${inspectorCollapsed ? "inspector-collapsed" : ""}`}>
      <section className="question-stage">
        <div className="stage-header">
          <div>
            <h1>{props.mode === "wrong" ? "错题重练" : "刷题台"}</h1>
            <p>
              {props.settings.practiceMode === "memorize"
                ? "背题模式会直接展示答案和解析。"
                : "提交后会记录正确率、错题和平均用时。"}
            </p>
          </div>
          <div className="stage-tools">
            {props.settings.viewMode === "single" && (
              <div className="pager">
                <button
                  className="icon-button"
                  onClick={() => props.setCurrentIndex((index) => Math.max(index - 1, 0))}
                  disabled={props.currentIndex === 0}
                >
                  <ChevronLeft size={18} />
                </button>
                <strong>
                  {props.questions.length ? props.currentIndex + 1 : 0}/{props.questions.length}
                </strong>
                <button
                  className="icon-button"
                  onClick={() =>
                    props.setCurrentIndex((index) => Math.min(index + 1, props.questions.length - 1))
                  }
                  disabled={props.currentIndex >= props.questions.length - 1}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
            <button
              className="sidebar-toggle-button"
              onClick={() => setInspectorCollapsed((collapsed) => !collapsed)}
            >
              {inspectorCollapsed ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
              {inspectorCollapsed ? "显示侧栏" : "隐藏侧栏"}
            </button>
          </div>
        </div>
        {content}
      </section>

      {!inspectorCollapsed && (
        <aside className="inspector">
          <StatsPanel t={props.t} stats={props.stats} />
          {props.mode === "wrong" && <WrongSessionPanel session={props.wrongSession} />}
          <Navigator
            questions={props.questions}
            currentIndex={props.currentIndex}
            results={props.results}
            setCurrentIndex={props.setCurrentIndex}
            viewMode={props.settings.viewMode}
          />
        </aside>
      )}
    </div>
  );
}

function QuestionCard(props: {
  id?: string;
  index: number;
  question: Question;
  answers: AnswerMap;
  setAnswers: (value: AnswerMap | ((value: AnswerMap) => AnswerMap)) => void;
  result?: boolean;
  submitted: boolean;
  practiceMode: PracticeMode;
  onSubmit: () => void;
  onNext?: () => void;
  compact?: boolean;
  hideSubmit?: boolean;
}) {
  const showAnswer = props.submitted || props.practiceMode === "memorize";
  const updateAnswer = (id: string, value: string | string[]) => {
    props.setAnswers((current) => ({ ...current, [id]: value }));
  };
  return (
    <article id={props.id} className={`question-card ${props.compact ? "compact" : ""}`}>
      <div className="question-heading">
        <div>
          <span className="question-type">{typeLabels[props.question.type]}</span>
          <h2>
            {props.index + 1}. {props.question.title}
          </h2>
        </div>
        {props.submitted && (
          <span className={`result-chip ${props.result ? "correct" : "wrong"}`}>
            {props.result ? "正确" : "错误"}
          </span>
        )}
      </div>
      {props.question.prompt && <p className="prompt-text">{props.question.prompt}</p>}
      {props.question.hint && <div className="hint-box">提示：{props.question.hint}</div>}

      {props.question.type === "composite" ? (
        <div className="subquestion-stack">
          {props.question.subQuestions.length ? (
            props.question.subQuestions.map((subQuestion, index) => (
              <QuestionCard
                key={subQuestion.id}
                index={index}
                question={subQuestion}
                answers={props.answers}
                setAnswers={props.setAnswers}
                submitted={showAnswer}
                result={isAnswerCorrect(subQuestion, props.answers[subQuestion.id] ?? "")}
                practiceMode={props.practiceMode}
                onSubmit={() => undefined}
                compact
              />
            ))
          ) : (
            <textarea
              value={String(props.answers[props.question.id] ?? "")}
              onChange={(event) => updateAnswer(props.question.id, event.target.value)}
              placeholder="输入综合题作答"
            />
          )}
        </div>
      ) : (
        <AnswerInput question={props.question} value={props.answers[props.question.id]} onChange={updateAnswer} practiceMode={props.practiceMode} />
      )}

      {!props.compact && !props.hideSubmit && (
        <div className="question-actions">
          <button className="primary-button" onClick={props.onSubmit}>
            <Check size={17} /> 提交答案
          </button>
          {props.submitted && props.onNext && (
            <button onClick={props.onNext}>
              下一题 <ChevronRight size={17} />
            </button>
          )}
        </div>
      )}

      {showAnswer && (
        <div className="answer-panel">
          <div>
            <strong>答案</strong>
            <p>{formatAnswer(props.question.answer) || "未设置"}</p>
          </div>
          <div>
            <strong>解析</strong>
            <p>{props.question.explanation || "暂无解析"}</p>
          </div>
        </div>
      )}
    </article>
  );
}

function AnswerInput(props: {
  question: Question;
  value?: string | string[];
  onChange: (id: string, value: string | string[]) => void;
  practiceMode: PracticeMode;
}) {
  const { question } = props;
  const isMemorize = props.practiceMode === "memorize";
  if (question.type === "single" || question.type === "boolean") {
    const correctAnswer = String(question.answer);
    return (
      <div className="option-stack">
        {question.options.map((option) => {
          const isCorrect = isMemorize && option.label === correctAnswer;
          return (
            <label key={option.id} className={`option-row ${isCorrect ? "memorize-correct" : ""}`}>
              <input
                type="radio"
                name={question.id}
                checked={isMemorize ? option.label === correctAnswer : props.value === option.label}
                onChange={() => props.onChange(question.id, option.label)}
                readOnly={isMemorize}
              />
              <span>{option.label}</span>
              <p>{option.text}</p>
            </label>
          );
        })}
      </div>
    );
  }
  if (question.type === "multiple") {
    const correctAnswers = toArray(question.answer);
    const selected = isMemorize ? correctAnswers : toArray(props.value ?? []);
    return (
      <div className="option-stack">
        {question.options.map((option) => {
          const isCorrect = isMemorize && correctAnswers.includes(option.label);
          return (
            <label key={option.id} className={`option-row ${isCorrect ? "memorize-correct" : ""}`}>
              <input
                type="checkbox"
                checked={selected.includes(option.label)}
                onChange={(event) => {
                  if (isMemorize) return;
                  const next = event.target.checked
                    ? [...selected, option.label]
                    : selected.filter((item) => item !== option.label);
                  props.onChange(question.id, next);
                }}
                readOnly={isMemorize}
              />
              <span>{option.label}</span>
              <p>{option.text}</p>
            </label>
          );
        })}
      </div>
    );
  }
  if (question.type === "blank") {
    const blanks = Math.max(1, toArray(question.answer).length);
    const values = toArray(props.value ?? Array.from({ length: blanks }, () => ""));
    return (
      <div className="blank-grid">
        {Array.from({ length: blanks }).map((_, index) => (
          <input
            key={index}
            value={values[index] ?? ""}
            placeholder={`空 ${index + 1}`}
            onChange={(event) => {
              const next = [...values];
              next[index] = event.target.value;
              props.onChange(question.id, next);
            }}
          />
        ))}
      </div>
    );
  }
  return (
    <textarea
      value={String(props.value ?? "")}
      onChange={(event) => props.onChange(question.id, event.target.value)}
      placeholder="输入你的答案"
    />
  );
}

function StatsPanel(props: { t: (key: string) => string; stats: ReturnType<typeof getListStats> }) {
  const items = [
    [props.t("correctRate"), `${props.stats.accuracy}%`],
    [props.t("avgTime"), `${props.stats.avgTime}s`],
    [props.t("finished"), `${props.stats.submitted}`],
    [props.t("wrongCount"), `${props.stats.wrong}`],
  ];
  return (
    <section className="inspector-panel">
      <h3>统计</h3>
      <div className="stats-grid">
        {items.map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="progress-line">
        <span style={{ width: `${props.stats.total ? (props.stats.attempted / props.stats.total) * 100 : 0}%` }} />
      </div>
      <small>
        进度 {props.stats.attempted}/{props.stats.total}
      </small>
    </section>
  );
}

function WrongSessionPanel(props: { session: WrongSession | null }) {
  const submitted = props.session?.submitted ?? 0;
  const correct = props.session?.correct ?? 0;
  const accuracy = submitted ? Math.round((correct / submitted) * 100) : 0;
  const elapsed = props.session?.elapsedSeconds ?? 0;
  const items = [
    ["本次正确率", `${accuracy}%`],
    ["本次用时", formatDuration(elapsed)],
    ["本次提交", `${submitted}`],
    ["本次错题", `${Math.max(0, submitted - correct)}`],
  ];
  return (
    <section className="inspector-panel temp-stats-panel">
      <h3>临时统计</h3>
      <div className="stats-grid">
        {items.map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="progress-line temp">
        <span style={{ width: `${accuracy}%` }} />
      </div>
      <small>进入新的错题单会自动重置</small>
    </section>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}:${String(seconds).padStart(2, "0")}`;
  const hours = Math.floor(minutes / 60);
  return `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function ControlPanel(props: {
  t: (key: string) => string;
  settings: AppData["settings"];
  updateSettings: (patch: Partial<AppData["settings"]>) => void;
  onRedoWrong: () => void;
  onExportWrong: () => void;
}) {
  return (
    <section className="inspector-panel">
      <h3>控制</h3>
      <Segmented
        value={props.settings.viewMode}
        options={[
          ["single", props.t("singleQuestion")],
          ["paper", props.t("allQuestions")],
        ]}
        onChange={(value) => props.updateSettings({ viewMode: value as ViewMode })}
      />
      <Segmented
        value={props.settings.practiceMode}
        options={[
          ["practice", props.t("practice")],
          ["memorize", props.t("memorize")],
        ]}
        onChange={(value) => props.updateSettings({ practiceMode: value as PracticeMode })}
      />
      <Segmented
        value={props.settings.submitMode}
        options={[
          ["each", "逐题提交"],
          ["paper", "统一提交"],
        ]}
        onChange={(value) => props.updateSettings({ submitMode: value as SubmitMode })}
      />
      {props.settings.practiceMode !== "memorize" && props.settings.submitMode !== "paper" && (
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={props.settings.autoNext}
            onChange={(event) => props.updateSettings({ autoNext: event.target.checked })}
          />
          {props.t("autoNext")}
        </label>
      )}
      <label className="field-label">
        {props.t("sort")}
        <select
          value={props.settings.sortMode}
          onChange={(event) => props.updateSettings({ sortMode: event.target.value as AppData["settings"]["sortMode"] })}
        >
          <option value="manual">{props.t("manual")}</option>
          <option value="random">{props.t("random")}</option>
          <option value="name">{props.t("name")}</option>
          <option value="type">{props.t("type")}</option>
        </select>
      </label>
      <div className="two-col-actions">
        <button onClick={props.onRedoWrong}>{props.t("redoWrong")}</button>
        <button onClick={props.onExportWrong}>{props.t("exportWrong")}</button>
      </div>
    </section>
  );
}

function Navigator(props: {
  questions: Question[];
  currentIndex: number;
  results: ResultMap;
  setCurrentIndex: (value: number) => void;
  viewMode: "single" | "paper";
}) {
  const handleClick = (index: number) => {
    debugLog("Navigate to question", { index, questionId: props.questions[index]?.id });
    props.setCurrentIndex(index);
    if (props.viewMode === "paper") {
      const el = document.getElementById(`question-${index}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  return (
    <section className="inspector-panel navigator-panel">
      <h3>快捷切题</h3>
      <div className="question-nav-grid">
        {props.questions.map((question, index) => (
          <button
            key={question.id}
            className={`${index === props.currentIndex ? "active" : ""} ${
              question.id in props.results ? (props.results[question.id] ? "correct" : "wrong") : ""
            }`}
            onClick={() => handleClick(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </section>
  );
}

function ManagerPage(props: {
  t: (key: string) => string;
  list: QuestionList;
  updateList: (recipe: (list: QuestionList) => QuestionList) => void;
  editing: Question | null;
  setEditing: (question: Question | null) => void;
  pushToast: (tone: Toast["tone"], message: string) => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
  showPrompt: (title: string, defaultValue: string, onSubmit: (value: string) => void) => void;
  onClearListAttempts: () => void;
  onDeleteList: () => void;
}) {
  const [localListName, setLocalListName] = useState(props.list.name);
  const [showLlmConfig, setShowLlmConfig] = useState(false);
  const [showFillChoice, setShowFillChoice] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LlmConfig>(() => loadLlmConfig(defaultLlmConfig));
  const [filling, setFilling] = useState(false);
  const [fillStreamText, setFillStreamText] = useState("");

  useEffect(() => setLocalListName(props.list.name), [props.list.id, props.list.name]);

  const handleFillAnswers = () => {
    const config = loadLlmConfig(defaultLlmConfig);
    setLlmConfig(config);
    if (!config.apiKey.trim()) {
      setShowLlmConfig(true);
      return;
    }
    setShowFillChoice(true);
  };

  const runFill = async (config: LlmConfig, mode: "answer" | "explanation" | "both") => {
    if (!props.list.questions.length) {
      props.pushToast("info", "当前题单没有题目。");
      return;
    }
    debugLog("LLM fill started", { mode, questionCount: props.list.questions.length, provider: config.provider, model: config.model });
    setShowFillChoice(false);
    setFilling(true);
    setFillStreamText("");
    try {
      const updated = await fillAnswersWithLlm(props.list.questions, config, mode, (accumulated) => {
        setFillStreamText(accumulated);
      });
      debugLog("LLM fill completed", { mode, updatedCount: updated.length });
      props.updateList((list) => ({
        ...list,
        questions: updated,
        updatedAt: new Date().toISOString(),
      }));
      if (props.editing) {
        const refreshed = updated.find((q) => q.id === props.editing!.id);
        if (refreshed) props.setEditing(refreshed);
      }
      const label = mode === "answer" ? "答案" : mode === "explanation" ? "解析" : "答案和解析";
      props.pushToast("success", `LLM 已补充${label}。`);
    } catch (error) {
      debugLog("LLM fill failed", error);
      props.pushToast("error", error instanceof Error ? error.message : "LLM 补充失败。");
    } finally {
      setFilling(false);
    }
  };

  const saveLlmConfigAndRun = () => {
    saveLlmConfig(llmConfig);
    setShowLlmConfig(false);
    if (llmConfig.apiKey.trim()) {
      setShowFillChoice(true);
    }
  };

  const saveQuestion = (question: Question) => {
    debugLog("Question saved", { id: question.id, title: question.title, type: question.type });
    props.updateList((list) => {
      const exists = list.questions.some((item) => item.id === question.id);
      return {
        ...list,
        questions: exists
          ? list.questions.map((item) => (item.id === question.id ? question : item))
          : [...list.questions, question],
        updatedAt: new Date().toISOString(),
      };
    });
    props.setEditing(null);
    props.pushToast("success", "题目已保存。");
  };

  const deleteQuestion = (id: string) => {
    props.showConfirm("确定删除这道题吗？", () => {
      debugLog("Question deleted", { id });
      props.updateList((list) => ({
        ...list,
        questions: list.questions.filter((question) => question.id !== id),
        updatedAt: new Date().toISOString(),
      }));
    });
  };

  return (
    <div className="manager-layout">
      <section className="manager-list">
        <div className="stage-header">
          <div>
            <h1>{props.t("manager")}</h1>
            <p>新增、删除、修改、查询题目，并维护当前题单信息。</p>
          </div>
          <div className="stage-tools">
            <button onClick={handleFillAnswers} disabled={filling}>
              <BrainCircuit size={17} /> {filling ? "补充中…" : "LLM 补充答案/解析"}
            </button>
            <button className="primary-button" onClick={() => props.setEditing(createEmptyQuestion())}>
              <Plus size={17} /> {props.t("addQuestion")}
            </button>
          </div>
        </div>
        <div className="manager-danger-actions">
          <button onClick={props.onClearListAttempts}>
            <Eraser size={16} /> 清空当前题单刷题数据
          </button>
          <button className="danger-outline" onClick={props.onDeleteList}>
            <Trash2 size={16} /> 删除当前题单
          </button>
        </div>
        <div className="list-editor">
          <input
            value={localListName}
            onChange={(event) => setLocalListName(event.target.value)}
            onBlur={() =>
              props.updateList((list) => ({
                ...list,
                name: localListName.trim() || list.name,
                updatedAt: new Date().toISOString(),
              }))
            }
          />
          <textarea
            value={props.list.description}
            placeholder="题单描述"
            onChange={(event) =>
              props.updateList((list) => ({
                ...list,
                description: event.target.value,
                updatedAt: new Date().toISOString(),
              }))
            }
          />
        </div>
        <div className="question-table">
          {props.list.questions.map((question, index) => (
            <div className="question-row" key={question.id}>
              <span>{index + 1}</span>
              <strong>{question.title}</strong>
              <small>{typeLabels[question.type]}</small>
              <p>{question.prompt || "暂无题干"}</p>
              <button className="icon-button" onClick={() => props.setEditing(question)}>
                <Edit3 size={16} />
              </button>
              <button className="icon-button" onClick={() => deleteQuestion(question.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <aside className="editor-panel">
        {filling ? (
          <div className="fill-stream-panel">
            <h2>LLM 补充中…</h2>
            <pre className="streaming-preview">{fillStreamText || "等待 AI 响应…\n\n有推理功能的模型需要等待推理完成后，才能在此处显示解析结果。"}</pre>
          </div>
        ) : props.editing ? (
          <QuestionEditor question={props.editing} onCancel={() => props.setEditing(null)} onSave={saveQuestion} showPrompt={props.showPrompt} />
        ) : (
          <EmptyState title="选择题目编辑" description="点击题目行或新增题目开始编辑。" />
        )}
      </aside>

      {showLlmConfig && (
        <div className="modal-overlay" onClick={() => setShowLlmConfig(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>配置 LLM</h2>
              <button className="icon-button" onClick={() => setShowLlmConfig(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="modal-desc">请配置 LLM 参数后再使用补充功能。此配置与 LLM 解析页面共享。</p>
            <div className="config-grid">
              <label className="field-label">
                提供商
                <select value={llmConfig.provider} onChange={(e) => setLlmConfig({ ...llmConfig, provider: e.target.value as LlmConfig["provider"], endpoint: "", model: "" })}>
                  <option value="openai">OpenAI 兼容</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="gemini">Gemini</option>
                  <option value="custom">自定义</option>
                </select>
              </label>
              <label className="field-label">
                模型
                <input
                  value={llmConfig.model}
                  placeholder={providerPlaceholders[llmConfig.provider].model}
                  onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                />
              </label>
              <label className="field-label wide">
                API 地址
                <input
                  value={llmConfig.endpoint}
                  placeholder={providerPlaceholders[llmConfig.provider].endpoint}
                  onChange={(e) => setLlmConfig({ ...llmConfig, endpoint: e.target.value })}
                />
              </label>
              <label className="field-label wide">
                API Key
                <input
                  type="password"
                  placeholder="sk-"
                  value={llmConfig.apiKey}
                  onChange={(e) => setLlmConfig({ ...llmConfig, apiKey: e.target.value })}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowLlmConfig(false)}>取消</button>
              <button className="primary-button" onClick={saveLlmConfigAndRun}>
                <Check size={17} /> 保存并继续
              </button>
            </div>
          </div>
        </div>
      )}

      {showFillChoice && (
        <div className="modal-overlay" onClick={() => setShowFillChoice(false)}>
          <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>选择补充内容</h2>
              <button className="icon-button" onClick={() => setShowFillChoice(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="modal-desc">选择需要 LLM 补充的部分，将对当前题单所有题目生效。</p>
            <div className="fill-choice-grid">
              <button onClick={() => runFill(llmConfig, "answer")}>
                <Check size={17} /> 仅补充答案
              </button>
              <button onClick={() => runFill(llmConfig, "explanation")}>
                <BookOpen size={17} /> 仅补充解析
              </button>
              <button className="primary-button" onClick={() => runFill(llmConfig, "both")}>
                <Sparkles size={17} /> 同时补充
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionEditor(props: {
  question: Question;
  onSave: (question: Question) => void;
  onCancel: () => void;
  showPrompt: (title: string, defaultValue: string, onSubmit: (value: string) => void) => void;
}) {
  const [draft, setDraft] = useState<Question>(props.question);
  useEffect(() => setDraft(props.question), [props.question]);
  const patch = (value: Partial<Question>) =>
    setDraft((current) => ({ ...current, ...value, updatedAt: new Date().toISOString() }));
  const updateOption = (id: string, patchValue: Partial<ChoiceOption>) => {
    patch({ options: draft.options.map((option) => (option.id === id ? { ...option, ...patchValue } : option)) });
  };
  return (
    <div className="question-editor">
      <div className="editor-title">
        <h2>编辑题目</h2>
        <button className="icon-button" onClick={props.onCancel}>
          <X size={18} />
        </button>
      </div>
      <label className="field-label">
        题型
        <select value={draft.type} onChange={(event) => patch({ type: event.target.value as QuestionType })}>
          {questionTypes.map((type) => (
            <option key={type} value={type}>
              {typeLabels[type]}
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        标题
        <input value={draft.title} onChange={(event) => patch({ title: event.target.value })} />
      </label>
      <label className="field-label">
        题干
        <textarea value={draft.prompt} onChange={(event) => patch({ prompt: event.target.value })} />
      </label>
      {(draft.type === "single" || draft.type === "multiple" || draft.type === "boolean") && (
        <div className="option-editor">
          <div className="section-title">
            <span>选项</span>
            {draft.type !== "boolean" && (
              <button
                className="icon-button"
                onClick={() =>
                  patch({
                    options: [...draft.options, { id: createId(), label: String.fromCharCode(65 + draft.options.length), text: "" }],
                  })
                }
              >
                <Plus size={16} />
              </button>
            )}
          </div>
          {draft.options.map((option) => (
            <div className="option-edit-row" key={option.id}>
              <input value={option.label} onChange={(event) => updateOption(option.id, { label: event.target.value })} />
              <input value={option.text} onChange={(event) => updateOption(option.id, { text: event.target.value })} />
              {draft.type !== "boolean" && (
                <button className="icon-button" onClick={() => patch({ options: draft.options.filter((item) => item.id !== option.id) })}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <label className="field-label">
        答案（多选/填空用 | 分隔）
        <input
          value={Array.isArray(draft.answer) ? draft.answer.join("|") : draft.answer}
          onChange={(event) =>
            patch({
              answer:
                draft.type === "multiple" || draft.type === "blank"
                  ? event.target.value.split("|").map((item) => item.trim()).filter(Boolean)
                  : event.target.value,
            })
          }
        />
      </label>
      <label className="field-label">
        解析
        <textarea value={draft.explanation} onChange={(event) => patch({ explanation: event.target.value })} />
      </label>
      {draft.type === "composite" && (
        <div className="sub-editor">
          <div className="section-title">
            <span>子题</span>
            <button
              className="icon-button"
              onClick={() => patch({ subQuestions: [...draft.subQuestions, createEmptyQuestion("single")] })}
            >
              <Plus size={16} />
            </button>
          </div>
          {draft.subQuestions.map((subQuestion, index) => (
            <button
              key={subQuestion.id}
              className="sub-row"
              onClick={() => {
                props.showPrompt("子题标题", subQuestion.title, (title) => {
                  patch({
                    subQuestions: draft.subQuestions.map((item) =>
                      item.id === subQuestion.id ? { ...item, title } : item,
                    ),
                  });
                });
              }}
            >
              {index + 1}. {subQuestion.title}
            </button>
          ))}
        </div>
      )}
      <div className="editor-actions">
        <button onClick={props.onCancel}>取消</button>
        <button className="primary-button" onClick={() => props.onSave(normalizeQuestion(draft))}>
          <Check size={17} /> 保存
        </button>
      </div>
    </div>
  );
}

function LlmPage(props: {
  t: (key: string) => string;
  activeList: QuestionList;
  updateActiveList: (recipe: (list: QuestionList) => QuestionList) => void;
  addImportedList: (list: QuestionList) => void;
  pushToast: (tone: Toast["tone"], message: string) => void;
  unsavedRef: MutableRefObject<boolean>;
}) {
  const [config, setConfig] = useState<LlmConfig>(() => loadLlmConfig(defaultLlmConfig));
  const [rawText, setRawText] = useState("");
  const [parsedList, setParsedList] = useState<QuestionList | null>(null);
  const [parsedJsonText, setParsedJsonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [modelList, setModelList] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [outputTab, setOutputTab] = useState<"json" | "preview">("json");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    props.unsavedRef.current = parsedList !== null;
  }, [parsedList]);

  useEffect(() => {
    saveLlmConfig(config);
  }, [config.provider, config.model, config.endpoint, config.apiKey]);

  const runParser = async () => {
    if (!rawText.trim()) {
      props.pushToast("error", "请先粘贴未整理题目文本。");
      return;
    }
    debugLog("LLM parse started", { provider: config.provider, model: config.model, textLength: rawText.length });
    setLoading(true);
    setStreamingText("");
    setParsedList(null);
    setParsedJsonText("");
    try {
      const fullText = await streamParseLlm(rawText, config, (accumulated) => {
        setStreamingText(accumulated);
      });
      const lists = parseQuestionJson(extractJsonText(fullText));
      debugLog("LLM parse completed", { questionCount: lists[0]?.questions.length ?? 0 });
      setParsedList(lists[0]);
      setParsedJsonText(JSON.stringify(lists[0], null, 2));
      setStreamingText("");
      setSaved(false);
      props.pushToast("success", "LLM 解析完成。");
    } catch (error) {
      debugLog("LLM parse failed", error);
      props.pushToast("error", error instanceof Error ? error.message : "LLM 解析失败。");
    } finally {
      setLoading(false);
    }
  };

  const updateProvider = (provider: LlmConfig["provider"]) => {
    setConfig((current) => ({
      ...current,
      provider,
      endpoint: "",
      model: "",
    }));
  };

  const runTest = async () => {
    setTesting(true);
    try {
      const model = await testLlmConnection(config);
      props.pushToast("success", `连接成功，模型 ${model} 可用。`);
    } catch (error) {
      props.pushToast("error", error instanceof Error ? error.message : "连接测试失败。");
    } finally {
      setTesting(false);
    }
  };

  const runFetchModels = async () => {
    setFetchingModels(true);
    try {
      const models = await fetchModelList(config);
      setModelList(models);
      if (!models.length) {
        props.pushToast("info", "未获取到可用模型。");
      } else {
        props.pushToast("success", `获取到 ${models.length} 个模型。`);
      }
    } catch (error) {
      props.pushToast("error", error instanceof Error ? error.message : "获取模型列表失败。");
    } finally {
      setFetchingModels(false);
    }
  };

  const getEditedList = () => {
    try {
      return normalizeImportedList(JSON.parse(parsedJsonText));
    } catch {
      props.pushToast("error", "解析结果 JSON 仍有格式错误，请修正后再操作。");
      return null;
    }
  };

  const validateAndSave = () => {
    const list = getEditedList();
    if (!list) return;
    if (!list.questions.length) {
      debugLog("Validation failed: no questions");
      props.pushToast("error", "校验失败：题单中没有题目。");
      return;
    }
    for (let i = 0; i < list.questions.length; i++) {
      const q = list.questions[i];
      if (!q.title.trim()) {
        debugLog("Validation failed: missing title", { index: i });
        props.pushToast("error", `校验失败：第 ${i + 1} 题缺少标题。`);
        return;
      }
      if ((q.type === "single" || q.type === "multiple") && q.options.length < 2) {
        debugLog("Validation failed: insufficient options", { index: i, optionCount: q.options.length });
        props.pushToast("error", `校验失败：第 ${i + 1} 题选项不足 2 个。`);
        return;
      }
    }
    debugLog("Validation passed", { questionCount: list.questions.length });
    setParsedList(list);
    setParsedJsonText(JSON.stringify(list, null, 2));
    setSaved(true);
    props.pushToast("success", "校验通过，已保存。");
  };

  const enterEdit = () => {
    setSaved(false);
  };

  return (
    <div className="llm-layout">
      <section className="llm-input">
        <div className="stage-header">
          <div>
            <h1>{props.t("llm")}</h1>
            <p>把未整理题目转换为标准题库 JSON，可补答案、解析并直接导入。</p>
          </div>
          <button className="primary-button" onClick={runParser} disabled={loading}>
            <Sparkles size={17} /> {loading ? "解析中" : props.t("parse")}
          </button>
        </div>
        <div className="config-grid">
          <label className="field-label">
            提供商
            <select value={config.provider} onChange={(event) => updateProvider(event.target.value as LlmConfig["provider"])}>
              <option value="openai">OpenAI 兼容</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Gemini</option>
              <option value="custom">自定义</option>
            </select>
          </label>
          <label className="field-label">
            模型
            <div className="model-input-row">
              <input
                list="model-list"
                value={config.model}
                placeholder={providerPlaceholders[config.provider].model}
                onChange={(event) => setConfig({ ...config, model: event.target.value })}
              />
              <button
                className="test-button"
                onClick={runFetchModels}
                disabled={fetchingModels || !config.apiKey.trim()}
                title="获取可用模型列表"
              >
                {fetchingModels ? "获取中…" : "获取列表"}
              </button>
            </div>
            {modelList.length > 0 && (
              <datalist id="model-list">
                {modelList.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            )}
          </label>
          <label className="field-label wide">
            API 地址
            <input
              value={config.endpoint}
              placeholder={providerPlaceholders[config.provider].endpoint}
              onChange={(event) => setConfig({ ...config, endpoint: event.target.value })}
            />
          </label>
          <label className="field-label wide">
            API Key
            <input type="password" placeholder="sk-" value={config.apiKey} onChange={(event) => setConfig({ ...config, apiKey: event.target.value })} />
          </label>
          <div className="field-label">
            <button className="test-button" onClick={runTest} disabled={testing}>
              {testing ? "测试中…" : "测试连接"}
            </button>
          </div>
          <label className="toggle-row">
            <input type="checkbox" checked={config.fillAnswer} onChange={(event) => setConfig({ ...config, fillAnswer: event.target.checked })} />
            让 LLM 补充答案
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={config.fillExplanation}
              onChange={(event) => setConfig({ ...config, fillExplanation: event.target.checked })}
            />
            让 LLM 补充解析
          </label>
        </div>
        <textarea
          className="raw-question-input"
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="粘贴未整理格式的题目文本..."
        />
      </section>
      <section className="llm-output">
        <div className="section-title">
          <span>{props.t("parsedQuestions")}</span>
          {parsedList && (
            <div className="inline-actions">
              <Segmented
                value={outputTab}
                options={[["json", "JSON"], ["preview", "题目预览"]]}
                onChange={(v) => setOutputTab(v as "json" | "preview")}
              />
              {saved ? (
                <>
                  <button onClick={enterEdit}>
                    <Edit3 size={16} /> 修改
                  </button>
                  <button
                    onClick={() => {
                      const list = getEditedList();
                      if (list) {
                        debugLog("Export parsed JSON", { name: list.name, questionCount: list.questions.length });
                        downloadJson(`${list.name}.json`, list);
                        props.unsavedRef.current = false;
                      }
                    }}
                  >
                    <Download size={16} /> {props.t("exportJson")}
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => {
                      const edited = getEditedList();
                      if (!edited) return;
                      debugLog("Import to current list", { questionCount: edited.questions.length });
                      props.updateActiveList((currentList) => ({
                        ...currentList,
                        questions: [...currentList.questions, ...edited.questions],
                        updatedAt: new Date().toISOString(),
                      }));
                      props.unsavedRef.current = false;
                    }}
                  >
                    <Plus size={16} /> 导入当前题单
                  </button>
                  <button
                    onClick={() => {
                      const list = getEditedList();
                      if (list) {
                        debugLog("Create new list from parsed", { name: list.name, questionCount: list.questions.length });
                        props.addImportedList(list);
                        props.unsavedRef.current = false;
                      }
                    }}
                  >
                    <Copy size={16} /> 新建题单
                  </button>
                </>
              ) : (
                <button className="primary-button" onClick={validateAndSave}>
                  <Check size={16} /> 校验并保存
                </button>
              )}
            </div>
          )}
        </div>
        {parsedList ? (
          outputTab === "json" ? (
            <textarea
              className="json-preview"
              value={parsedJsonText}
              readOnly={saved}
              onChange={(event) => {
                const nextText = event.target.value;
                setParsedJsonText(nextText);
                try {
                  setParsedList(normalizeImportedList(JSON.parse(nextText)));
                } catch {
                  setParsedList(parsedList);
                }
              }}
            />
          ) : (
            <ParsedQuestionsEditor
              list={parsedList}
              readOnly={saved}
              onChange={(updated) => {
                setParsedList(updated);
                setParsedJsonText(JSON.stringify(updated, null, 2));
              }}
            />
          )
        ) : loading ? (
          <pre className="streaming-preview">{streamingText || "等待 AI 响应…\n\n有推理功能的模型需要等待推理完成后，才能在此处显示解析结果。"}</pre>
        ) : (
          <EmptyState title="等待解析" description="右侧会展示标准 JSON，用户可以直接编辑后导出或导入题单。" />
        )}
      </section>
    </div>
  );
}

function Segmented(props: {
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="segmented">
      {props.options.map(([value, label]) => (
        <button key={value} className={props.value === value ? "active" : ""} onClick={() => props.onChange(value)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function ParsedQuestionsEditor(props: {
  list: QuestionList;
  readOnly?: boolean;
  onChange: (list: QuestionList) => void;
}) {
  const updateQuestion = (index: number, patch: Partial<Question>) => {
    if (props.readOnly) return;
    const questions = props.list.questions.map((q, i) =>
      i === index ? { ...q, ...patch, updatedAt: new Date().toISOString() } : q,
    );
    props.onChange({ ...props.list, questions, updatedAt: new Date().toISOString() });
  };

  const deleteQuestion = (index: number) => {
    if (props.readOnly) return;
    const questions = props.list.questions.filter((_, i) => i !== index);
    props.onChange({ ...props.list, questions, updatedAt: new Date().toISOString() });
  };

  const addQuestion = () => {
    if (props.readOnly) return;
    const questions = [...props.list.questions, createEmptyQuestion()];
    props.onChange({ ...props.list, questions, updatedAt: new Date().toISOString() });
  };

  const updateOption = (qIndex: number, optIndex: number, patch: Partial<ChoiceOption>) => {
    if (props.readOnly) return;
    const question = props.list.questions[qIndex];
    const options = question.options.map((o, i) => (i === optIndex ? { ...o, ...patch } : o));
    updateQuestion(qIndex, { options });
  };

  const addOption = (qIndex: number) => {
    if (props.readOnly) return;
    const question = props.list.questions[qIndex];
    const nextLabel = String.fromCharCode(65 + question.options.length);
    const options = [...question.options, { id: createId(), label: nextLabel, text: "" }];
    updateQuestion(qIndex, { options });
  };

  const deleteOption = (qIndex: number, optIndex: number) => {
    if (props.readOnly) return;
    const question = props.list.questions[qIndex];
    const options = question.options.filter((_, i) => i !== optIndex);
    updateQuestion(qIndex, { options });
  };

  const updateSubQuestion = (qIndex: number, subIndex: number, patch: Partial<Question>) => {
    if (props.readOnly) return;
    const question = props.list.questions[qIndex];
    const subQuestions = question.subQuestions.map((sq, i) =>
      i === subIndex ? { ...sq, ...patch, updatedAt: new Date().toISOString() } : sq,
    );
    updateQuestion(qIndex, { subQuestions });
  };

  return (
    <div className="parsed-editor-stack">
      {props.list.questions.map((question, qIndex) => (
        <div className="parsed-question-card" key={question.id}>
          <div className="parsed-card-header">
            <span className="parsed-card-index">{qIndex + 1}</span>
            <select
              value={question.type}
              disabled={props.readOnly}
              onChange={(e) => updateQuestion(qIndex, { type: e.target.value as QuestionType })}
            >
              {questionTypes.map((t) => (
                <option key={t} value={t}>{typeLabels[t]}</option>
              ))}
            </select>
            {!props.readOnly && (
              <button className="icon-button danger-icon" title="删除题目" onClick={() => deleteQuestion(qIndex)}>
                <Trash2 size={15} />
              </button>
            )}
          </div>
          <label className="field-label">
            标题
            <input
              value={question.title}
              disabled={props.readOnly}
              onChange={(e) => updateQuestion(qIndex, { title: e.target.value })}
            />
          </label>
          <label className="field-label">
            题干
            <textarea
              value={question.prompt}
              disabled={props.readOnly}
              onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
            />
          </label>
          {(question.type === "single" || question.type === "multiple") && (
            <div className="parsed-options">
              <div className="parsed-options-header">
                <span className="parsed-options-label">选项</span>
                {!props.readOnly && (
                  <button className="icon-button" title="添加选项" onClick={() => addOption(qIndex)}>
                    <Plus size={14} />
                  </button>
                )}
              </div>
              {question.options.map((option, oIndex) => (
                <div className="parsed-option-row" key={option.id}>
                  <input
                    className="option-label-input"
                    value={option.label}
                    disabled={props.readOnly}
                    onChange={(e) => updateOption(qIndex, oIndex, { label: e.target.value })}
                  />
                  <input
                    value={option.text}
                    disabled={props.readOnly}
                    onChange={(e) => updateOption(qIndex, oIndex, { text: e.target.value })}
                  />
                  {!props.readOnly && (
                    <button className="icon-button danger-icon" title="删除选项" onClick={() => deleteOption(qIndex, oIndex)}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {question.type === "boolean" && (
            <div className="parsed-options">
              <span className="parsed-options-label">选项（判断题固定 T/F）</span>
              <div className="parsed-option-row">
                <input className="option-label-input" value="T" disabled />
                <input value="正确" disabled />
              </div>
              <div className="parsed-option-row">
                <input className="option-label-input" value="F" disabled />
                <input value="错误" disabled />
              </div>
            </div>
          )}
          <label className="field-label">
            答案{(question.type === "multiple" || question.type === "blank") && "（用 | 分隔）"}
            <input
              value={Array.isArray(question.answer) ? question.answer.join("|") : question.answer}
              disabled={props.readOnly}
              onChange={(e) =>
                updateQuestion(qIndex, {
                  answer:
                    question.type === "multiple" || question.type === "blank"
                      ? e.target.value.split("|").map((s) => s.trim()).filter(Boolean)
                      : e.target.value,
                })
              }
            />
          </label>
          <label className="field-label">
            解析
            <textarea
              value={question.explanation}
              disabled={props.readOnly}
              onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
            />
          </label>
          {question.type === "composite" && question.subQuestions.length > 0 && (
            <div className="parsed-subquestions">
              <span className="parsed-options-label">子题</span>
              {question.subQuestions.map((sub, sIndex) => (
                <div className="parsed-subquestion-card" key={sub.id}>
                  <div className="parsed-card-header">
                    <span className="parsed-card-index">{qIndex + 1}.{sIndex + 1}</span>
                    <select
                      value={sub.type}
                      disabled={props.readOnly}
                      onChange={(e) => updateSubQuestion(qIndex, sIndex, { type: e.target.value as QuestionType })}
                    >
                      {questionTypes.map((t) => (
                        <option key={t} value={t}>{typeLabels[t]}</option>
                      ))}
                    </select>
                  </div>
                  <label className="field-label">
                    标题
                    <input
                      value={sub.title}
                      disabled={props.readOnly}
                      onChange={(e) => updateSubQuestion(qIndex, sIndex, { title: e.target.value })}
                    />
                  </label>
                  <label className="field-label">
                    答案
                    <input
                      value={Array.isArray(sub.answer) ? sub.answer.join("|") : sub.answer}
                      disabled={props.readOnly}
                      onChange={(e) =>
                        updateSubQuestion(qIndex, sIndex, {
                          answer:
                            sub.type === "multiple" || sub.type === "blank"
                              ? e.target.value.split("|").map((s) => s.trim()).filter(Boolean)
                              : e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="field-label">
                    解析
                    <textarea
                      value={sub.explanation}
                      disabled={props.readOnly}
                      onChange={(e) => updateSubQuestion(qIndex, sIndex, { explanation: e.target.value })}
                    />
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {!props.readOnly && (
        <button className="add-question-button" onClick={addQuestion}>
          <Plus size={16} /> 添加题目
        </button>
      )}
    </div>
  );
}

function EmptyState(props: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <FileJson size={34} />
      <strong>{props.title}</strong>
      <p>{props.description}</p>
    </div>
  );
}

function ToastStack(props: { toasts: Toast[] }) {
  return (
    <div className="toast-stack">
      {props.toasts.map((toast) => (
        <div className={`toast ${toast.tone}`} key={toast.id}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}

function evaluateQuestion(question: Question, answers: AnswerMap) {
  if (question.type === "composite" && question.subQuestions.length) {
    return question.subQuestions.every((subQuestion) =>
      isAnswerCorrect(subQuestion, answers[subQuestion.id] ?? ""),
    );
  }
  return isAnswerCorrect(question, answers[question.id] ?? "");
}

function collectCompositeAnswer(question: Question, answers: AnswerMap) {
  if (question.type !== "composite") return answers[question.id] ?? "";
  return question.subQuestions.map((subQuestion) => `${subQuestion.title}: ${formatAnswer(answers[subQuestion.id] ?? "")}`);
}

type ConfirmDialogState = {
  message: string;
  onConfirm: () => void;
} | null;

type PromptDialogState = {
  title: string;
  defaultValue: string;
  onSubmit: (value: string) => void;
} | null;

function ConfirmDialog({ state, onClose }: { state: ConfirmDialogState; onClose: () => void }) {
  if (!state) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>确认</h2>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>{state.message}</p>
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button style={{ background: "var(--danger)", color: "#fff", borderColor: "var(--danger)" }} onClick={() => { state.onConfirm(); onClose(); }}>确定</button>
        </div>
      </div>
    </div>
  );
}

function PromptDialog({ state, onClose }: { state: PromptDialogState; onClose: () => void }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state) {
      setValue(state.defaultValue);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [state]);

  if (!state) return null;

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    state.onSubmit(trimmed);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{state.title}</h2>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          style={{ marginTop: 8 }}
        />
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button style={{ background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }} onClick={handleSubmit}>确定</button>
        </div>
      </div>
    </div>
  );
}
