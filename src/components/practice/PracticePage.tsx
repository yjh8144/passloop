import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Check, ChevronLeft, ChevronRight, Download, Plus, Shuffle, Undo2, X } from "lucide-react";
import type { AppData, Question, Toast } from "../../lib/types";
import { getListStats } from "../../lib/question";
import { EmptyState } from "../ui/EmptyState";
import { StatsPanel } from "../practice/StatsPanel";
import { WrongSessionPanel } from "../practice/WrongSessionPanel";
import type { WrongSession } from "../practice/WrongSessionPanel";
import { Navigator } from "../practice/Navigator";
import { QuestionCard } from "../practice/QuestionCard";

type Page = "practice" | "manager" | "llm" | "wrong";
type AnswerMap = Record<string, string | string[]>;
type ResultMap = Record<string, boolean>;

export function PracticePage(props: {
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
  onRedoWrong: () => void;
  onExportWrong: () => void;
  onCreateWrongList: () => void;
  onClearListAttempts: () => void;
  startedAtRef: MutableRefObject<Record<string, number>>;
}) {
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const activeQuestion = props.questions[props.currentIndex];
  useEffect(() => {
    if (activeQuestion && !props.startedAtRef.current[activeQuestion.id]) {
      props.startedAtRef.current[activeQuestion.id] = Date.now();
    }
  }, [activeQuestion, props.startedAtRef]);

  const allSubmitted = props.questions.length > 0 && props.questions.every((q) => q.id in props.results);
  const correctCount = props.questions.filter((q) => props.results[q.id] === true).length;
  const wrongCount = props.questions.filter((q) => props.results[q.id] === false).length;

  const prevAllSubmitted = useRef(false);
  useEffect(() => {
    if (allSubmitted && !prevAllSubmitted.current) {
      setShowCompletionDialog(true);
    }
    prevAllSubmitted.current = allSubmitted;
  }, [allSubmitted]);

  const paperStackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (props.settings.viewMode !== "paper" || !props.questions.length) return;
    const container = paperStackRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            const idx = Number(id.replace("question-", ""));
            if (!isNaN(idx)) props.setCurrentIndex(idx);
          }
        }
      },
      { root: container.closest(".question-stage"), threshold: 0.5 },
    );
    const cards = container.querySelectorAll("[id^='question-']");
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [props.settings.viewMode, props.questions.length]);

  const content =
    props.questions.length === 0 ? (
      <EmptyState title="暂无题目" description="请先导入题库 JSON，或在题库管理中新增题目。" />
    ) : props.settings.viewMode === "paper" ? (
      <div className="paper-stack" ref={paperStackRef}>
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
            revealMode={props.settings.revealMode}
            allSubmitted={allSubmitted}
          />
        ))}
        {props.settings.practiceMode !== "memorize" && props.settings.submitMode === "paper" && props.questions.some((q) => !(q.id in props.results)) && (
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
          hideSubmit={props.settings.submitMode === "paper"}
          revealMode={props.settings.revealMode}
          allSubmitted={allSubmitted}
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
        <div className="mobile-navigator">
          <Navigator
            questions={props.questions}
            currentIndex={props.currentIndex}
            results={props.results}
            setCurrentIndex={props.setCurrentIndex}
            viewMode={props.settings.viewMode}
            revealMode={props.settings.revealMode}
            allSubmitted={allSubmitted}
          />
        </div>
        {content}
        {props.settings.viewMode === "single" && props.settings.submitMode === "paper" && props.settings.practiceMode !== "memorize" && props.currentIndex >= props.questions.length - 1 && props.questions.some((q) => !(q.id in props.results)) && (
          <button className="submit-all-button" onClick={props.submitAll}>
            <Check size={18} /> 提交全部答案
          </button>
        )}
      </section>

      {!inspectorCollapsed && (
        <aside className="inspector">
          {allSubmitted && (
            <section className="inspector-panel completion-actions-panel">
              <h3>全部完成</h3>
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", margin: "0 0 10px" }}>
                共 {props.questions.length} 题，正确 {correctCount} 题，错误 {wrongCount} 题
              </p>
              <div className="completion-buttons">
                <button className="btn-danger" onClick={props.onClearListAttempts}>
                  <Undo2 size={16} /> 重新刷题
                </button>
                <button onClick={props.onRedoWrong}>
                  <Shuffle size={16} /> 重做错题
                </button>
                <button onClick={props.onExportWrong}>
                  <Download size={16} /> 导出错题
                </button>
                <button onClick={props.onCreateWrongList}>
                  <Plus size={16} /> 错题生成题单
                </button>
              </div>
            </section>
          )}
          <StatsPanel t={props.t} stats={props.stats} />
          {props.mode === "wrong" && <WrongSessionPanel session={props.wrongSession} />}
          <div className="desktop-navigator">
            <Navigator
              questions={props.questions}
              currentIndex={props.currentIndex}
              results={props.results}
              setCurrentIndex={props.setCurrentIndex}
              viewMode={props.settings.viewMode}
              revealMode={props.settings.revealMode}
              allSubmitted={allSubmitted}
            />
          </div>
        </aside>
      )}

      {showCompletionDialog && (
        <div className="modal-overlay" onClick={() => setShowCompletionDialog(false)}>
          <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>答题完成</h2>
              <button className="icon-button" onClick={() => setShowCompletionDialog(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="completion-stats">
              <div className="completion-stat-row">
                <span>总题数</span><strong>{props.questions.length}</strong>
              </div>
              <div className="completion-stat-row">
                <span>正确</span><strong className="text-correct">{correctCount}</strong>
              </div>
              <div className="completion-stat-row">
                <span>错误</span><strong className="text-wrong">{wrongCount}</strong>
              </div>
              <div className="completion-stat-row">
                <span>正确率</span><strong>{props.questions.length ? Math.round((correctCount / props.questions.length) * 100) : 0}%</strong>
              </div>
            </div>
            <div className="completion-buttons">
              <button className="btn-danger" onClick={() => { setShowCompletionDialog(false); props.onClearListAttempts(); }}>
                <Undo2 size={16} /> 重新刷题
              </button>
              <button onClick={() => { setShowCompletionDialog(false); props.onRedoWrong(); }}>
                <Shuffle size={16} /> 重做错题
              </button>
              <button onClick={() => { setShowCompletionDialog(false); props.onExportWrong(); }}>
                <Download size={16} /> 导出错题
              </button>
              <button onClick={() => { setShowCompletionDialog(false); props.onCreateWrongList(); }}>
                <Plus size={16} /> 错题生成题单
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
