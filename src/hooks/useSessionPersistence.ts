import { useEffect } from "react"
import type { AnswerMap } from "./types"
import { saveSessionAnswers, saveSessionIndex } from "../utils/session"

export function useSessionPersistence(answers: AnswerMap, currentIndex: number) {
  useEffect(() => saveSessionAnswers(answers), [answers])
  useEffect(() => saveSessionIndex(currentIndex), [currentIndex])
}
