import type { AnswerMap, ResultMap } from "./types"
import { debugLog } from "../lib/debug"

export interface PracticeState {
  answers: AnswerMap
  results: ResultMap
  currentIndex: number
}

export type PracticeAction =
  | { type: "SET_ANSWER"; answerKey: string; value: string | string[] }
  | { type: "SET_ANSWERS"; answers: AnswerMap }
  | { type: "SET_ANSWERS_FN"; updater: (current: AnswerMap) => AnswerMap }
  | { type: "NAVIGATE"; index: number }
  | { type: "NAVIGATE_FN"; updater: (current: number) => number }
  | { type: "SUBMIT_QUESTION"; resultKey: string; correct: boolean }
  | {
      type: "SUBMIT_ALL"
      results: Record<string, boolean>
    }
  | {
      type: "RESTORE_DERIVED_STATE"
      questionKeys: string[]
      results: ResultMap
      answers: AnswerMap
      removeAnswerKeys?: string[]
    }
  | { type: "LIST_RESET_FULL" }
  | { type: "LIST_RESET_SELECTIVE"; questionKeys: string[] }
  | { type: "CLAMP_INDEX"; maxIndex: number }

export function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  debugLog("[practiceReducer]", action.type, action)
  switch (action.type) {
    case "SET_ANSWER":
      return { ...state, answers: { ...state.answers, [action.answerKey]: action.value } }

    case "SET_ANSWERS":
      return { ...state, answers: action.answers }

    case "SET_ANSWERS_FN":
      return { ...state, answers: action.updater(state.answers) }

    case "NAVIGATE":
      return { ...state, currentIndex: action.index }

    case "NAVIGATE_FN":
      return { ...state, currentIndex: action.updater(state.currentIndex) }

    case "SUBMIT_QUESTION": {
      const nextResults = { ...state.results, [action.resultKey]: action.correct }
      return { ...state, results: nextResults }
    }

    case "SUBMIT_ALL": {
      const nextResults = { ...state.results, ...action.results }
      return { ...state, results: nextResults }
    }

    case "RESTORE_DERIVED_STATE": {
      const nextResults = { ...state.results }
      const nextAnswers = { ...state.answers }
      for (const key of action.questionKeys) {
        if (key in nextResults) delete nextAnswers[key]
        delete nextResults[key]
      }
      for (const key of action.removeAnswerKeys ?? []) {
        delete nextAnswers[key]
      }
      return {
        ...state,
        answers: { ...nextAnswers, ...action.answers },
        results: { ...nextResults, ...action.results },
      }
    }

    case "LIST_RESET_FULL":
      return { answers: {}, results: {}, currentIndex: 0 }

    case "LIST_RESET_SELECTIVE": {
      const nextAnswers = { ...state.answers }
      const nextResults = { ...state.results }
      for (const key of action.questionKeys) {
        delete nextAnswers[key]
        delete nextResults[key]
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
