import type { LanguageName } from "../types"
import { zh } from "./zh"
import { en } from "./en"
import { ja } from "./ja"
import { ko } from "./ko"
import { fr } from "./fr"

type Dict = Record<string, string>

const dicts: Record<LanguageName, Dict> = { zh, en, ja, ko, fr }

export function getTranslator(language: LanguageName) {
  const dict = dicts[language] ?? zh
  return (key: string, ...args: (string | number)[]) => {
    let text = dict[key] ?? key
    for (let i = 0; i < args.length; i++) {
      text = text.replace(`{${i}}`, String(args[i]))
    }
    return text
  }
}
