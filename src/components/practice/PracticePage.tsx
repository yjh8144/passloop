import { useEffect, useRef, useState } from "react"
import type { MutableRefObject } from "react"
import { BarChart3, Check, ChevronLeft, ChevronRight } from "lucide-react"
import type { AppData, Question } from "../../lib/types"
import { getListStats } from "../../lib/question"
import { EmptyState } from "../ui/EmptyState"
import type { WrongSession } from "./WrongSessionPanel"
import { Navigator } from "./Navigator"
import { QuestionCard } from "./QuestionCard"
import { InspectorContent } from "./InspectorContent"
import { CompletionDialog } from "./CompletionDialog"
import type { AnswerMap, Page, ResultMap } from "../../hooks/types"
import { useT } from "../../contexts"

export function PracticePage(props: {
  mode: Page
  questions: Question[]
  currentIndex: number
  setCurrentIndex: (value: number | ((value: number) => number)) => void
  answers: AnswerMap
  setAnswers: (value: AnswerMap | ((value: AnswerMap) => AnswerMap)) => void
  results: ResultMap
  submitQuestion: (question: Question) => void
  submitAll: () => void
  settings: AppData["settings"]
  updateSettings: (patch: Partial<AppData["settings"]>) => void
  stats: ReturnType<typeof getListStats>
  wrongSession: WrongSession | null
  onRedoWrong: () => void
  onExportWrong: () => void
  onCreateWrongList: () => void
  onClearListAttempts: () => void
  startedAtRef: MutableRefObject<Record<string, number>>
}) {
  const t = useT()
  const { startedAtRef, setCurrentIndex, questions, settings } = props
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false)
  const [inspectorFloatOpen, setInspectorFloatOpen] = useState(false)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const activeQuestion = questions[props.currentIndex]
  useEffect(() => {
    if (activeQuestion && !startedAtRef.current[activeQuestion.id]) {
      startedAtRef.current[activeQuestion.id] = Date.now()
    }
  }, [activeQuestion, startedAtRef])

  const allSubmitted =
    props.questions.length > 0 && props.questions.every((q) => q.id in props.results)
  const correctCount = props.questions.filter((q) => props.results[q.id] === true).length
  const wrongCount = props.questions.filter((q) => props.results[q.id] === false).length

  useEffect(() => {
    if (!inspectorFloatOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInspectorFloatOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [inspectorFloatOpen])

  const prevAllSubmitted = useRef(false)
  useEffect(() => {
    if (allSubmitted && !prevAllSubmitted.current) {
      setShowCompletionDialog(true)
    }
    prevAllSubmitted.current = allSubmitted
  }, [allSubmitted])

  const paperStackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (settings.viewMode !== "paper" || !questions.length) return
    const container = paperStackRef.current
    if (!container) return
    const stage = container.closest(".question-stage")
    const scrollRoot = stage && stage.scrollHeight > stage.clientHeight ? stage : null
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { idx: number; ratio: number } | null = null
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const id = entry.target.id
          const idx = Number(id.replace("question-", ""))
          if (isNaN(idx)) continue
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { idx, ratio: entry.intersectionRatio }
          }
        }
        if (best) setCurrentIndex(best.idx)
      },
      { root: scrollRoot, threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    const cards = container.querySelectorAll("[id^='question-']")
    cards.forEach((card) => observer.observe(card))
    return () => observer.disconnect()
  }, [settings.viewMode, questions.length, setCurrentIndex])

  const content =
    props.questions.length === 0 ? (
      <EmptyState title={t("noQuestionsTitle")} description={t("noQuestionsDesc")} />
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
        {props.settings.practiceMode !== "memorize" &&
          props.settings.submitMode === "paper" &&
          props.questions.some((q) => !(q.id in props.results)) && (
            <button className="submit-all-button" onClick={props.submitAll}>
              <Check size={18} /> {t("submitAllAnswers")}
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
          onNext={
            props.currentIndex < props.questions.length - 1
              ? () => props.setCurrentIndex((i) => i + 1)
              : undefined
          }
          hideSubmit={props.settings.submitMode === "paper"}
          revealMode={props.settings.revealMode}
          allSubmitted={allSubmitted}
        />
      )
    )

  return (
    <div className={`practice-layout ${inspectorCollapsed ? "inspector-collapsed" : ""}`}>
      <section className="question-stage">
        <div className="stage-header">
          <div>
            <h1>{props.mode === "wrong" ? t("wrongPracticeTitle") : t("practiceTitle")}</h1>
            <p>
              {props.settings.practiceMode === "memorize" ? t("memorizeHint") : t("practiceHint")}
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
                    props.setCurrentIndex((index) =>
                      Math.min(index + 1, props.questions.length - 1),
                    )
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
              {inspectorCollapsed ? t("showSidebar") : t("hideSidebar")}
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
        {props.settings.viewMode === "single" &&
          props.settings.submitMode === "paper" &&
          props.settings.practiceMode !== "memorize" &&
          props.currentIndex >= props.questions.length - 1 &&
          props.questions.some((q) => !(q.id in props.results)) && (
            <button className="submit-all-button" onClick={props.submitAll}>
              <Check size={18} /> {t("submitAllAnswers")}
            </button>
          )}
      </section>

      {!inspectorCollapsed && (
        <aside className="inspector">
          <InspectorContent
            questions={props.questions}
            currentIndex={props.currentIndex}
            setCurrentIndex={props.setCurrentIndex}
            results={props.results}
            stats={props.stats}
            settings={props.settings}
            mode={props.mode}
            wrongSession={props.wrongSession}
            allSubmitted={allSubmitted}
            correctCount={correctCount}
            wrongCount={wrongCount}
            navigatorClassName="desktop-navigator"
            onClearListAttempts={props.onClearListAttempts}
            onRedoWrong={props.onRedoWrong}
            onExportWrong={props.onExportWrong}
            onCreateWrongList={props.onCreateWrongList}
          />
        </aside>
      )}

      <button
        className="inspector-fab"
        onClick={() => setInspectorFloatOpen(true)}
        title={t("statsAndNav")}
      >
        <BarChart3 size={22} />
      </button>
      <div
        className={`inspector-float-backdrop ${inspectorFloatOpen ? "is-visible" : ""}`}
        onClick={() => setInspectorFloatOpen(false)}
      />
      <div className={`inspector-float ${inspectorFloatOpen ? "is-open" : ""}`}>
        <div className="inspector-float-inner">
          <InspectorContent
            questions={props.questions}
            currentIndex={props.currentIndex}
            setCurrentIndex={(idx) => {
              props.setCurrentIndex(idx)
              setInspectorFloatOpen(false)
            }}
            results={props.results}
            stats={props.stats}
            settings={props.settings}
            mode={props.mode}
            wrongSession={props.wrongSession}
            allSubmitted={allSubmitted}
            correctCount={correctCount}
            wrongCount={wrongCount}
            onClearListAttempts={props.onClearListAttempts}
            onRedoWrong={props.onRedoWrong}
            onExportWrong={props.onExportWrong}
            onCreateWrongList={props.onCreateWrongList}
          />
        </div>
      </div>

      <CompletionDialog
        open={showCompletionDialog}
        onClose={() => setShowCompletionDialog(false)}
        questions={props.questions}
        results={props.results}
        onClearListAttempts={props.onClearListAttempts}
        onRedoWrong={props.onRedoWrong}
        onExportWrong={props.onExportWrong}
        onCreateWrongList={props.onCreateWrongList}
      />
    </div>
  )
}
