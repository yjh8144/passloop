import type { LanguageName, TFunc } from "../types"
import { zh } from "./zh"

type Dict = Record<string, string>

const dictLoaders: Record<LanguageName, () => Promise<Dict>> = {
  zh: () => Promise.resolve(zh),
  en: () => import("./en").then((module) => module.en),
  ja: () => import("./ja").then((module) => module.ja),
  ko: () => import("./ko").then((module) => module.ko),
  fr: () => import("./fr").then((module) => module.fr),
}

function createTranslator(dict: Dict): TFunc {
  return (key: string, ...args: (string | number)[]) => {
    let text = dict[key] ?? key
    for (let i = 0; i < args.length; i++) {
      text = text.replace(`{${i}}`, String(args[i]))
    }
    return text
  }
}

export function getTranslator(language: LanguageName): TFunc {
  return createTranslator(language === "zh" ? zh : zh)
}

export async function loadTranslator(language: LanguageName): Promise<TFunc> {
  const dict = await (dictLoaders[language] ?? dictLoaders.zh)()
  return createTranslator(dict)
}
