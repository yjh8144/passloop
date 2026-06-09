import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BarChart3, Check, ChevronLeft, ChevronRight } from "lucide-react"
import { EmptyState } from "../ui/EmptyState"
import { Navigator } from "./Navigator"
import { QuestionCard } from "./QuestionCard"
import { InspectorContent } from "./InspectorContent"
import { CompletionDialog } from "./CompletionDialog"
import { useT, usePracticeContext, useAppData } from "../../contexts"
import { loadPosition } from "../../utils/session"
import { debugLog } from "../../lib/debug"
import { getListStats } from "../../lib/question"
import type { AttemptRecord } from "../../lib/types"

const PAPER_SCROLL_LOCK_MS = 650

export function PracticePage() {
  const t = useT()
  const { data, clearActiveListAttempts, activeList } = useAppData()
  const {
    practiceQuestions: questions,
    currentIndex,
    setCurrentIndex,
    answers,
    setAnswers,
    results,
    submitQuestion,
    submitAll,
    practiceWrongList,
    exportWrongList,
    hasWrongListCandidates,
    startedAtRef,
  } = usePracticeContext()

  const settings = data.settings

  const [inspectorCollapsed, setInspectorCollapsed] = useState(false)
  const [inspectorFloatOpen, setInspectorFloatOpen] = useState(false)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const activeQuestion = questions[currentIndex]
  useEffect(() => {
    if (activeQuestion && !startedAtRef.current[activeQuestion.id]) {
      startedAtRef.current[activeQuestion.id] = Date.now()
    }
  }, [activeQuestion, startedAtRef])

  const allSubmitted = questions.length > 0 && questions.every((q) => q.id in results)
  const correctCount = questions.filter((q) => results[q.id] === true).length
  const wrongCount = questions.filter((q) => results[q.id] === false).length
  const visibleStats = useMemo(() => {
    const attemptByQuestion = new Map<string, AttemptRecord>()
    for (const attempt of data.attempts) {
      if (attempt.listId !== activeList.id) continue
      const prev = attemptByQuestion.get(attempt.questionId)
      if (!prev || attempt.submittedAt >= prev.submittedAt) {
        attemptByQuestion.set(attempt.questionId, attempt)
      }
    }
    for (const question of questions) {
      if (!(question.id in results)) continue
      const prev = attemptByQuestion.get(question.id)
      attemptByQuestion.set(question.id, {
        id: prev?.id ?? `session-${question.id}`,
        listId: activeList.id,
        questionId: question.id,
        answer: prev?.answer ?? answers[question.id] ?? "",
        correct: results[question.id],
        elapsedMs: prev?.elapsedMs ?? 0,
        submittedAt: prev?.submittedAt ?? "",
      })
    }
    return getListStats({ ...activeList, questions }, [...attemptByQuestion.values()])
  }, [activeList, questions, data.attempts, results, answers])

  useEffect(() => {
    if (!inspectorFloatOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInspectorFloatOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [inspectorFloatOpen])

  const completionLoggedRef = useRef(false)
  const showCompletionBanner = allSubmitted

  useEffect(() => {
    if (allSubmitted && !completionLoggedRef.current) {
      debugLog("[PracticePage] all questions submitted", {
        total: questions.length,
        correctCount,
        wrongCount,
      })
      completionLoggedRef.current = true
    }
    if (!allSubmitted && completionLoggedRef.current) {
      completionLoggedRef.current = false
    }
  }, [allSubmitted, correctCount, questions.length, wrongCount])

  const paperStackRef = useRef<HTMLDivElement>(null)
  const initialScrollDoneRef = useRef<string | null>(null)
  const restoringRef = useRef(false)
  // Suppresses the paper-mode IntersectionObserver during programmatic smooth scrolls.
  // Without this, mid-scroll the observer can pick the next neighbour as "best visible"
  // and overwrite the index just set by a Navigator click. 0 = no lock; otherwise a timeout id.
  const paperScrollLockRef = useRef<number>(0)

  useEffect(
    () => () => {
      if (paperScrollLockRef.current) {
        window.clearTimeout(paperScrollLockRef.current)
        paperScrollLockRef.current = 0
      }
    },
    [],
  )

  const jumpToPaperIndex = useCallback(
    (index: number) => {
      if (paperScrollLockRef.current) {
        window.clearTimeout(paperScrollLockRef.current)
      }
      paperScrollLockRef.current = window.setTimeout(() => {
        paperScrollLockRef.current = 0
      }, PAPER_SCROLL_LOCK_MS)
      setCurrentIndex(index)
      const el = document.getElementById(`question-${index}`)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    },
    [setCurrentIndex],
  )

  useEffect(() => {
    if (settings.viewMode !== "paper" || !questions.length) return
    const container = paperStackRef.current
    if (!container) return
    const stage = container.closest(".question-stage")
    const scrollRoot = stage && stage.scrollHeight > stage.clientHeight ? stage : null
    const ratioMap = new Map<number, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id
          const idx = Number(id.replace("question-", ""))
          if (isNaN(idx)) continue
          if (entry.isIntersecting) {
            ratioMap.set(idx, entry.intersectionRatio)
          } else {
            ratioMap.delete(idx)
          }
        }
        let best: { idx: number; ratio: number } | null = null
        for (const [idx, ratio] of ratioMap) {
          if (!best || ratio > best.ratio || (ratio === best.ratio && idx < best.idx)) {
            best = { idx, ratio }
          }
        }
        if (best && !restoringRef.current && paperScrollLockRef.current === 0)
          setCurrentIndex(best.idx)
      },
      { root: scrollRoot, threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    const cards = container.querySelectorAll("[id^='question-']")
    cards.forEach((card) => observer.observe(card))
    return () => observer.disconnect()
  }, [settings.viewMode, questions.length, setCurrentIndex])

  // Restore scroll position to the last-viewed question when reopening in paper mode.
  // currentIndex is restored by the context, but paper mode renders all questions in a
  // scroll stack and nothing scrolls to it; the observer would also clobber it back to 0.
  useEffect(() => {
    if (settings.viewMode !== "paper" || !questions.length) return
    if (initialScrollDoneRef.current === activeList.id) return
    initialScrollDoneRef.current = activeList.id
    const target = Math.min(loadPosition(activeList.id), questions.length - 1)
    if (target <= 0) return
    restoringRef.current = true
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document
          .getElementById(`question-${target}`)
          ?.scrollIntoView({ behavior: "instant", block: "start" })
        setCurrentIndex(target)
        requestAnimationFrame(() => {
          restoringRef.current = false
        })
      })
    })
  }, [settings.viewMode, questions.length, activeList.id, setCurrentIndex])

  const emptyTitle = activeList.questions.length ? t("noSearchResultsTitle") : t("noQuestionsTitle")
  const emptyDescription = activeList.questions.length
    ? t("noSearchResultsDesc")
    : t("noQuestionsDesc")

  const content =
    questions.length === 0 ? (
      <EmptyState title={emptyTitle} description={emptyDescription} />
    ) : settings.viewMode === "paper" ? (
      <div className="paper-stack" ref={paperStackRef}>
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            id={`question-${index}`}
            index={index}
            question={question}
            answers={answers}
            setAnswers={setAnswers}
            result={results[question.id]}
            submitted={question.id in results}
            practiceMode={settings.practiceMode}
            onSubmit={() => submitQuestion(question)}
            onAutoSubmit={(value) => submitQuestion(question, value)}
            autoNext={settings.autoNext}
            autoNextPause={settings.autoNextPause}
            hideSubmit={settings.submitMode === "paper"}
            revealMode={settings.revealMode}
            allSubmitted={allSubmitted}
          />
        ))}
        {settings.practiceMode !== "memorize" &&
          settings.submitMode === "paper" &&
          questions.some((q) => !(q.id in results)) && (
            <button className="submit-all-button" onClick={submitAll}>
              <Check size={18} /> {t("submitAllAnswers")}
            </button>
          )}
      </div>
    ) : (
      activeQuestion && (
        <QuestionCard
          index={currentIndex}
          question={activeQuestion}
          answers={answers}
          setAnswers={setAnswers}
          result={results[activeQuestion.id]}
          submitted={activeQuestion.id in results}
          practiceMode={settings.practiceMode}
          onSubmit={() => submitQuestion(activeQuestion)}
          onAutoSubmit={(value) => submitQuestion(activeQuestion, value)}
          autoNext={settings.autoNext}
          autoNextPause={settings.autoNextPause}
          onNext={
            currentIndex < questions.length - 1 ? () => setCurrentIndex((i) => i + 1) : undefined
          }
          hideSubmit={settings.submitMode === "paper"}
          revealMode={settings.revealMode}
          allSubmitted={allSubmitted}
        />
      )
    )

  return (
    <div className={`practice-layout ${inspectorCollapsed ? "inspector-collapsed" : ""}`}>
      <section className="question-stage">
        <div className="stage-header">
          <div>
            <h1>{t("practiceTitle")}</h1>
            <p>{settings.practiceMode === "memorize" ? t("memorizeHint") : t("practiceHint")}</p>
          </div>
          <div className="stage-tools">
            {settings.submitMode === "paper" &&
              settings.practiceMode !== "memorize" &&
              questions.some((q) => !(q.id in results)) && (
                <button className="submit-all-button compact" onClick={submitAll}>
                  <Check size={16} /> {t("submitAllAnswers")}
                </button>
              )}
            {settings.viewMode === "single" && (
              <div className="pager">
                <button
                  className="icon-button"
                  aria-label={t("previous")}
                  onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft size={18} />
                </button>
                <strong>
                  {questions.length ? currentIndex + 1 : 0}/{questions.length}
                </strong>
                <button
                  className="icon-button"
                  aria-label={t("next")}
                  onClick={() =>
                    setCurrentIndex((index) => Math.min(index + 1, questions.length - 1))
                  }
                  disabled={currentIndex >= questions.length - 1}
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
        {showCompletionBanner && (
          <div className="completion-banner">
            <span>{t("completionSummary", questions.length, correctCount, wrongCount)}</span>
            <button onClick={() => setShowCompletionDialog(true)}>{t("viewStats")}</button>
          </div>
        )}
        <div className="mobile-navigator">
          <Navigator
            questions={questions}
            currentIndex={currentIndex}
            results={results}
            setCurrentIndex={setCurrentIndex}
            viewMode={settings.viewMode}
            revealMode={settings.revealMode}
            allSubmitted={allSubmitted}
            onPaperJump={jumpToPaperIndex}
          />
        </div>
        {content}
      </section>

      {!inspectorCollapsed && (
        <aside className="inspector">
          <InspectorContent
            questions={questions}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            results={results}
            stats={visibleStats}
            settings={settings}
            allSubmitted={allSubmitted}
            correctCount={correctCount}
            wrongCount={wrongCount}
            navigatorClassName="desktop-navigator"
            onClearListAttempts={clearActiveListAttempts}
            onPracticeWrong={practiceWrongList}
            onExportWrong={exportWrongList}
            hasWrongListCandidates={hasWrongListCandidates}
            onPaperJump={jumpToPaperIndex}
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
            questions={questions}
            currentIndex={currentIndex}
            setCurrentIndex={(idx) => {
              setCurrentIndex(idx)
              setInspectorFloatOpen(false)
            }}
            results={results}
            stats={visibleStats}
            settings={settings}
            allSubmitted={allSubmitted}
            correctCount={correctCount}
            wrongCount={wrongCount}
            onClearListAttempts={clearActiveListAttempts}
            onPracticeWrong={practiceWrongList}
            onExportWrong={exportWrongList}
            hasWrongListCandidates={hasWrongListCandidates}
            onPaperJump={(idx) => {
              jumpToPaperIndex(idx)
              setInspectorFloatOpen(false)
            }}
          />
        </div>
      </div>

      <CompletionDialog
        open={showCompletionDialog}
        onClose={() => setShowCompletionDialog(false)}
        questions={questions}
        results={results}
        onClearListAttempts={clearActiveListAttempts}
        onPracticeWrong={practiceWrongList}
        onExportWrong={exportWrongList}
      />
    </div>
  )
}
