import { useEffect } from "react"
import type { AnswerMap } from "./types"
import type { WrongSession } from "./practiceReducer"
import { saveSessionAnswers, saveSessionIndex, saveWrongSession } from "../utils/session"
import { debugLog } from "../lib/debug"

export function useSessionPersistence(
  answers: AnswerMap,
  currentIndex: number,
  wrongSession: WrongSession | null,
) {
  useEffect(() => {
    debugLog("[useSessionPersistence] saving answers", Object.keys(answers).length, "entries")
    saveSessionAnswers(answers)
  }, [answers])
  useEffect(() => {
    debugLog("[useSessionPersistence] saving index", currentIndex)
    saveSessionIndex(currentIndex)
  }, [currentIndex])
  useEffect(() => {
    saveWrongSession(wrongSession)
  }, [wrongSession])
}
