import type { AnswerMap, ResultMap } from "./types"
import { debugLog } from "../lib/debug"

export interface WrongSession {
  id: string
  startedAt: number
  elapsedSeconds: number
  submitted: number
  correct: number
}

export interface PracticeState {
  answers: AnswerMap
  results: ResultMap
  currentIndex: number
  wrongSession: WrongSession | null
}

export type PracticeAction =
  | { type: "SET_ANSWER"; questionId: string; value: string | string[] }
  | { type: "SET_ANSWERS"; answers: AnswerMap }
  | { type: "SET_ANSWERS_FN"; updater: (current: AnswerMap) => AnswerMap }
  | { type: "NAVIGATE"; index: number }
  | { type: "NAVIGATE_FN"; updater: (current: number) => number }
  | { type: "SUBMIT_QUESTION"; questionId: string; correct: boolean; inWrongMode: boolean }
  | {
      type: "SUBMIT_ALL"
      results: Record<string, boolean>
      submittedCount: number
      correctCount: number
      inWrongMode: boolean
    }
  | { type: "START_WRONG_PRACTICE"; sessionId: string; startedAt: number; questionIds: string[] }
  | { type: "TICK_TIMER"; elapsedSeconds: number }
  | { type: "LIST_RESET_FULL" }
  | { type: "LIST_RESET_SELECTIVE"; questionIds: string[] }
  | { type: "CLAMP_INDEX"; maxIndex: number }

export function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  if (action.type !== "TICK_TIMER") {
    debugLog("[practiceReducer]", action.type, action)
  }
  switch (action.type) {
    case "SET_ANSWER":
      return { ...state, answers: { ...state.answers, [action.questionId]: action.value } }

    case "SET_ANSWERS":
      return { ...state, answers: action.answers }

    case "SET_ANSWERS_FN":
      return { ...state, answers: action.updater(state.answers) }

    case "NAVIGATE":
      return { ...state, currentIndex: action.index }

    case "NAVIGATE_FN":
      return { ...state, currentIndex: action.updater(state.currentIndex) }

    case "SUBMIT_QUESTION": {
      const nextResults = { ...state.results, [action.questionId]: action.correct }
      const nextWrongSession =
        action.inWrongMode && state.wrongSession
          ? {
              ...state.wrongSession,
              submitted: state.wrongSession.submitted + 1,
              correct: state.wrongSession.correct + (action.correct ? 1 : 0),
            }
          : state.wrongSession
      return { ...state, results: nextResults, wrongSession: nextWrongSession }
    }

    case "SUBMIT_ALL": {
      const nextResults = { ...state.results, ...action.results }
      const nextWrongSession =
        action.inWrongMode && state.wrongSession
          ? {
              ...state.wrongSession,
              submitted: state.wrongSession.submitted + action.submittedCount,
              correct: state.wrongSession.correct + action.correctCount,
            }
          : state.wrongSession
      return { ...state, results: nextResults, wrongSession: nextWrongSession }
    }

    case "START_WRONG_PRACTICE": {
      const nextAnswers = { ...state.answers }
      const nextResults = { ...state.results }
      for (const id of action.questionIds) {
        delete nextAnswers[id]
        delete nextResults[id]
      }
      return {
        ...state,
        answers: nextAnswers,
        results: nextResults,
        currentIndex: 0,
        wrongSession: {
          id: action.sessionId,
          startedAt: action.startedAt,
          elapsedSeconds: 0,
          submitted: 0,
          correct: 0,
        },
      }
    }

    case "TICK_TIMER":
      return state.wrongSession
        ? {
            ...state,
            wrongSession: { ...state.wrongSession, elapsedSeconds: action.elapsedSeconds },
          }
        : state

    case "LIST_RESET_FULL":
      return { answers: {}, results: {}, currentIndex: 0, wrongSession: null }

    case "LIST_RESET_SELECTIVE": {
      const nextAnswers = { ...state.answers }
      const nextResults = { ...state.results }
      for (const id of action.questionIds) {
        delete nextAnswers[id]
        delete nextResults[id]
      }
      return {
        ...state,
        answers: nextAnswers,
        results: nextResults,
        currentIndex: 0,
        wrongSession: null,
      }
    }

    case "CLAMP_INDEX":
      return state.currentIndex > action.maxIndex
        ? { ...state, currentIndex: Math.max(action.maxIndex, 0) }
        : state

    default:
      return state
  }
}
