import { useEffect, useRef, useState } from "react"
import { BarChart3, Check, ChevronLeft, ChevronRight } from "lucide-react"
import { EmptyState } from "../ui/EmptyState"
import { Navigator } from "./Navigator"
import { QuestionCard } from "./QuestionCard"
import { InspectorContent } from "./InspectorContent"
import { CompletionDialog } from "./CompletionDialog"
import { useT, usePracticeContext, useAppData, useNavigation } from "../../contexts"
import { debugLog } from "../../lib/debug"

export function PracticePage() {
  const t = useT()
  const { page } = useNavigation()
  const { data, stats, clearActiveListAttempts } = useAppData()
  const {
    practiceQuestions: questions,
    currentIndex,
    setCurrentIndex,
    answers,
    setAnswers,
    results,
    submitQuestion,
    submitAll,
    wrongSession: rawWrongSession,
    resetWrongPractice,
    exportWrongList,
    createWrongList,
    startedAtRef,
    paperScrollLockRef,
  } = usePracticeContext()

  const settings = data.settings
  const wrongSession = page === "wrong" ? rawWrongSession : null

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

  useEffect(() => {
    if (!inspectorFloatOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInspectorFloatOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [inspectorFloatOpen])

  const prevAllSubmitted = useRef(false)
  const [showCompletionBanner, setShowCompletionBanner] = useState(false)
  useEffect(() => {
    if (allSubmitted && !prevAllSubmitted.current) {
      debugLog("[PracticePage] all questions submitted", {
        total: questions.length,
        correctCount,
        wrongCount,
      })
      setShowCompletionBanner(true)
    }
    if (!allSubmitted) setShowCompletionBanner(false)
    prevAllSubmitted.current = allSubmitted
  }, [allSubmitted])

  const paperStackRef = useRef<HTMLDivElement>(null)

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
        if (paperScrollLockRef.current) return
        let best: { idx: number; ratio: number } | null = null
        for (const [idx, ratio] of ratioMap) {
          if (!best || ratio > best.ratio || (ratio === best.ratio && idx < best.idx)) {
            best = { idx, ratio }
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
    questions.length === 0 ? (
      <EmptyState title={t("noQuestionsTitle")} description={t("noQuestionsDesc")} />
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
            <h1>{page === "wrong" ? t("wrongPracticeTitle") : t("practiceTitle")}</h1>
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
            stats={stats}
            settings={settings}
            mode={page}
            wrongSession={wrongSession}
            allSubmitted={allSubmitted}
            correctCount={correctCount}
            wrongCount={wrongCount}
            navigatorClassName="desktop-navigator"
            onClearListAttempts={clearActiveListAttempts}
            onRedoWrong={resetWrongPractice}
            onExportWrong={exportWrongList}
            onCreateWrongList={createWrongList}
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
            stats={stats}
            settings={settings}
            mode={page}
            wrongSession={wrongSession}
            allSubmitted={allSubmitted}
            correctCount={correctCount}
            wrongCount={wrongCount}
            onClearListAttempts={clearActiveListAttempts}
            onRedoWrong={resetWrongPractice}
            onExportWrong={exportWrongList}
            onCreateWrongList={createWrongList}
          />
        </div>
      </div>

      <CompletionDialog
        open={showCompletionDialog}
        onClose={() => setShowCompletionDialog(false)}
        questions={questions}
        results={results}
        onClearListAttempts={clearActiveListAttempts}
        onRedoWrong={resetWrongPractice}
        onExportWrong={exportWrongList}
        onCreateWrongList={createWrongList}
      />
    </div>
  )
}
