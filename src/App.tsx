import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type {
  AppData,
  LlmConfig,
  Question,
  QuestionList,
} from "./lib/types";
import { getTranslator } from "./lib/i18n/index";
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
  createId,
  getListStats,
  normalizeImportedList,
  parseQuestionJson,
  sortQuestions,
  typeLabels,
} from "./lib/question";
import { debugLog } from "./lib/debug";
import { defaultLlmConfig, ONBOARDING_KEY } from "./utils/constants";
import { useToast } from "./hooks/useToast";
import { loadSessionAnswers, saveSessionAnswers, loadSessionIndex, saveSessionIndex } from "./utils/session";
import { evaluateQuestion, collectCompositeAnswer } from "./utils/evaluate";
import { ToastStack } from "./components/ui/ToastStack";
import { ResetConfirmDialog } from "./components/dialogs/ResetConfirmDialog";
import { OnboardingDialog } from "./components/dialogs/OnboardingDialog";
import { ConfirmDialog, PromptDialog } from "./components/dialogs/ConfirmDialog";
import type { ConfirmDialogState, PromptDialogState } from "./components/dialogs/ConfirmDialog";
import { ImportSourceDialog } from "./components/dialogs/ImportSourceDialog";
import { ImportChoiceDialog } from "./components/dialogs/ImportChoiceDialog";
import { BackupImportDialog } from "./components/dialogs/BackupImportDialog";
import { Sidebar } from "./components/layout/Sidebar";
import { BottomNav } from "./components/layout/BottomNav";
import { Topbar } from "./components/layout/Topbar";
import { ManagerPage } from "./components/manager/ManagerPage";
import { LlmConfigModal } from "./components/llm/LlmConfigModal";
import { LlmPage } from "./components/llm/LlmPage";
import { PracticePage } from "./components/practice/PracticePage";
import type { WrongSession } from "./components/practice/WrongSessionPanel";

type Page = "practice" | "manager" | "llm" | "wrong";
type AnswerMap = Record<string, string | string[]>;
type ResultMap = Record<string, boolean>;

export function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [page, setPage] = useState<Page>("practice");
  const [query, setQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(() => loadSessionIndex());
  const [answers, setAnswers] = useState<AnswerMap>(() => loadSessionAnswers());
  const [results, setResults] = useState<ResultMap>({});
  const [editing, setEditing] = useState<Question | null>(null);
  const { toasts, pushToast } = useToast();
  const [wrongSession, setWrongSession] = useState<WrongSession | null>(null);
  const [mobileSidebarCollapsed, setMobileSidebarCollapsed] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);
  const [promptDialog, setPromptDialog] = useState<PromptDialogState>(null);
  const [resetConfirmDialog, setResetConfirmDialog] = useState(false);
  const [pendingImportLists, setPendingImportLists] = useState<QuestionList[] | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem(ONBOARDING_KEY);
  });
  const [llmConfig, setLlmConfig] = useState<LlmConfig>(() => loadLlmConfig(defaultLlmConfig));
  const [showGlobalLlmConfig, setShowGlobalLlmConfig] = useState(false);
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
    saveLlmConfig(llmConfig);
  }, [llmConfig]);

  useEffect(() => saveSessionAnswers(answers), [answers]);
  useEffect(() => saveSessionIndex(currentIndex), [currentIndex]);

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
      const lists = parseQuestionJson(await readFileAsText(file)).map((l) => ({ ...l, id: createId() }));
      debugLog("Question import", { fileName: file.name, listCount: lists.length, totalQuestions: lists.reduce((sum, l) => sum + l.questions.length, 0) });
      setPendingImportLists(lists);
      setShowImportDialog(false);
    } catch (error) {
      debugLog("Question import failed", error);
      pushToast("error", error instanceof Error ? error.message : "导入失败。");
    }
  };

  const handleUrlImport = async (url: string) => {
    const proxyUrl = llmConfig.proxyUrl || defaultLlmConfig.proxyUrl;
    const proxyKey = llmConfig.proxyKey || defaultLlmConfig.proxyKey;
    const fetchUrl = proxyUrl
      ? `${proxyUrl.replace(/\/+$/, "")}/?url=${encodeURIComponent(url)}`
      : url;
    const headers: Record<string, string> = {};
    if (proxyUrl && proxyKey) {
      headers["X-Proxy-Key"] = proxyKey;
    }
    try {
      const response = await fetch(fetchUrl, { headers });
      if (!response.ok) {
        throw new Error(`请求失败：${response.status}`);
      }
      const text = await response.text();
      const lists = parseQuestionJson(text).map((l) => ({ ...l, id: createId() }));
      debugLog("URL import", { url, listCount: lists.length, totalQuestions: lists.reduce((sum, l) => sum + l.questions.length, 0) });
      setPendingImportLists(lists);
      setShowImportDialog(false);
    } catch (error) {
      debugLog("URL import failed", error);
      pushToast("error", error instanceof Error ? error.message : "URL 导入失败。");
    }
  };

  const commitImport = (mode: "current" | "new") => {
    if (!pendingImportLists) return;
    const questions = pendingImportLists.flatMap((l) => l.questions).map((q) => ({ ...q, id: createId() }));
    if (mode === "current") {
      debugLog("Import to current list", { questionCount: questions.length });
      updateActiveList((list) => ({
        ...list,
        questions: [...list.questions, ...questions],
        updatedAt: new Date().toISOString(),
      }));
      pushToast("success", `已添加 ${questions.length} 道题到当前题单。`);
    } else {
      const name = pendingImportLists.length === 1 ? pendingImportLists[0].name : `导入题单`;
      debugLog("Import as new list", { name, questionCount: questions.length });
      updateData((current) => {
        const newList: QuestionList = {
          id: createId(),
          name,
          description: "",
          questions,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return { ...current, lists: [...current.lists, newList], activeListId: newList.id };
      });
      pushToast("success", `已创建新题单「${name}」，共 ${questions.length} 道题。`);
    }
    setPendingImportLists(null);
  };

  const [pendingBackup, setPendingBackup] = useState<AppData | null>(null);

  const handleBackupImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = normalizeAppData(JSON.parse(await readFileAsText(file)));
      debugLog("Backup import parsed", { listCount: imported.lists.length, attemptCount: imported.attempts.length });
      setPendingBackup(imported);
    } catch {
      pushToast("error", "文件不是有效的 PassLoop 配置数据。");
    }
  };

  const commitBackupImport = (mode: "overwrite" | "merge") => {
    if (!pendingBackup) return;
    if (mode === "overwrite") {
      debugLog("Backup import: overwrite");
      setData(pendingBackup);
      pushToast("success", "配置已覆盖恢复。");
    } else {
      debugLog("Backup import: merge", { existingLists: data.lists.length, importedLists: pendingBackup.lists.length });
      const existingIds = new Set(data.lists.map((l) => l.id));
      const newLists = pendingBackup.lists
        .map((l) => existingIds.has(l.id) ? { ...l, id: createId() } : l);
      const existingAttemptKeys = new Set(data.attempts.map((a) => `${a.questionId}-${a.submittedAt}`));
      const newAttempts = pendingBackup.attempts.filter((a) => !existingAttemptKeys.has(`${a.questionId}-${a.submittedAt}`));
      updateData((current) => ({
        ...current,
        lists: [...current.lists, ...newLists],
        attempts: [...current.attempts, ...newAttempts],
      }));
      pushToast("success", `已合并 ${newLists.length} 个题单。`);
    }
    setPendingBackup(null);
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

  const isAnswerEmpty = (question: Question): boolean => {
    if (question.type === "composite") {
      if (!question.subQuestions.length) {
        const val = answers[question.id];
        return !val || (typeof val === "string" && !val.trim());
      }
      return question.subQuestions.some((sq) => isAnswerEmpty(sq));
    }
    const val = answers[question.id];
    if (val === undefined || val === null) return true;
    if (Array.isArray(val)) return val.length === 0 || val.every((v) => !v.trim());
    return typeof val === "string" && !val.trim();
  };

  const submitQuestion = (question: Question) => {
    if (question.id in results) {
      const questions = page === "wrong" ? wrongQuestions : displayedQuestions;
      const allDone = questions.length > 0 && questions.every((q) => q.id in results);
      if (allDone) {
        pushToast("info", "题目已全部做完，请重新刷题后继续作答。");
      }
      return;
    }
    const doSubmit = () => {
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
      if (data.settings.revealMode === "end") {
        pushToast("info", "已提交。");
      } else {
        pushToast(correct ? "success" : "info", correct ? "回答正确。" : "已记录为错题。");
      }
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
    if (isAnswerEmpty(question)) {
      const questions = page === "wrong" ? wrongQuestions : displayedQuestions;
      const idx = questions.findIndex((q) => q.id === question.id);
      showConfirm(`第 ${idx + 1} 题尚未作答，确定提交吗？`, doSubmit);
    } else {
      doSubmit();
    }
  };

  const submitAll = () => {
    const questions = page === "wrong" ? wrongQuestions : displayedQuestions;
    const unsubmitted = questions.filter((q) => !(q.id in results));
    if (!unsubmitted.length) return;
    const emptyQuestions = unsubmitted.filter((q) => isAnswerEmpty(q));
    const doSubmitAll = () => {
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
    if (emptyQuestions.length) {
      const nums = emptyQuestions.map((q) => questions.indexOf(q) + 1).join("、");
      showConfirm(`第 ${nums} 题尚未作答，确定提交全部吗？`, doSubmitAll);
    } else {
      doSubmitAll();
    }
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

  const createWrongList = () => {
    if (!wrongQuestions.length) {
      pushToast("info", "当前题单还没有错题。");
      return;
    }
    const newList: QuestionList = {
      id: createId(),
      name: `${activeList.name} - 错题`,
      description: "由 PassLoop 根据答题记录生成的错题题单。",
      questions: wrongQuestions.map((q) => ({ ...q, id: createId() })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateData((current) => ({
      ...current,
      lists: [...current.lists, newList],
      activeListId: newList.id,
    }));
    pushToast("success", `已生成错题题单「${newList.name}」，共 ${wrongQuestions.length} 题。`);
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
        onQuestionImport={() => setShowImportDialog(true)}
        onBackupImport={handleBackupImport}
        onExportList={() => downloadJson(`${activeList.name}.json`, activeList)}
        onExportBackup={() => downloadJson("passloop-config.json", data)}
        onResetAll={resetAll}
        onOpenLlmConfig={() => setShowGlobalLlmConfig(true)}
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
          onCreateWrongList={createWrongList}
          onClearListAttempts={clearActiveListAttempts}
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
            onDeleteList={() => deleteList(activeList.id)}
            llmConfig={llmConfig}
            onOpenLlmConfig={() => setShowGlobalLlmConfig(true)}
          />
        ) : page === "llm" ? (
          <LlmPage
            t={t}
            activeList={activeList}
            updateActiveList={updateActiveList}
            addImportedList={addImportedList}
            pushToast={pushToast}
            unsavedRef={llmUnsavedRef}
            llmConfig={llmConfig}
            onOpenLlmConfig={() => setShowGlobalLlmConfig(true)}
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
            onRedoWrong={resetWrongPractice}
            onExportWrong={exportWrongList}
            onCreateWrongList={createWrongList}
            onClearListAttempts={clearActiveListAttempts}
            startedAtRef={startedAtRef}
          />
        )}
      </main>

      <BottomNav
        t={t}
        page={page}
        setPage={changePage}
        data={data}
        activeList={activeList}
        setData={setData}
        createList={createList}
        onQuestionImport={() => setShowImportDialog(true)}
        onBackupImport={handleBackupImport}
        onExportList={() => downloadJson(`${activeList.name}.json`, activeList)}
        onExportBackup={() => downloadJson("passloop-config.json", data)}
        onResetAll={resetAll}
        onOpenLlmConfig={() => setShowGlobalLlmConfig(true)}
      />

      <ToastStack toasts={toasts} />
      <ConfirmDialog state={confirmDialog} onClose={() => setConfirmDialog(null)} />
      <PromptDialog state={promptDialog} onClose={() => setPromptDialog(null)} />
      <ImportSourceDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onFileSelect={handleQuestionImport}
        onUrlImport={handleUrlImport}
      />
      <ImportChoiceDialog
        lists={pendingImportLists}
        activeListName={activeList.name}
        onClose={() => setPendingImportLists(null)}
        onChoose={commitImport}
      />
      <BackupImportDialog
        data={pendingBackup}
        onClose={() => setPendingBackup(null)}
        onChoose={commitBackupImport}
      />
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
      <OnboardingDialog
        open={showOnboarding}
        onClose={() => {
          localStorage.setItem(ONBOARDING_KEY, "1");
          setShowOnboarding(false);
        }}
      />
      <LlmConfigModal
        open={showGlobalLlmConfig}
        onClose={() => setShowGlobalLlmConfig(false)}
        config={llmConfig}
        setConfig={setLlmConfig}
        pushToast={pushToast}
      />
    </div>
  );
}
