import type { AnswerMap, ResultMap } from "./types"
import { debugLog } from "../lib/debug"

export interface PracticeState {
  answers: AnswerMap
  results: ResultMap
  currentIndex: number
}

export type PracticeAction =
  | { type: "SET_ANSWER"; questionId: string; value: string | string[] }
  | { type: "SET_ANSWERS"; answers: AnswerMap }
  | { type: "SET_ANSWERS_FN"; updater: (current: AnswerMap) => AnswerMap }
  | { type: "NAVIGATE"; index: number }
  | { type: "NAVIGATE_FN"; updater: (current: number) => number }
  | { type: "SUBMIT_QUESTION"; questionId: string; correct: boolean }
  | {
      type: "SUBMIT_ALL"
      results: Record<string, boolean>
    }
  | { type: "RESTORE_RESULTS"; results: ResultMap }
  | { type: "RESTORE_ANSWERS"; answers: AnswerMap }
  | { type: "LIST_RESET_FULL" }
  | { type: "LIST_RESET_SELECTIVE"; questionIds: string[] }
  | { type: "CLAMP_INDEX"; maxIndex: number }

export function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  debugLog("[practiceReducer]", action.type, action)
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
      return { ...state, results: nextResults }
    }

    case "SUBMIT_ALL": {
      const nextResults = { ...state.results, ...action.results }
      return { ...state, results: nextResults }
    }

    case "RESTORE_RESULTS":
      return { ...state, results: { ...state.results, ...action.results } }

    case "RESTORE_ANSWERS":
      return { ...state, answers: { ...state.answers, ...action.answers } }

    case "LIST_RESET_FULL":
      return { answers: {}, results: {}, currentIndex: 0 }

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
