import type { LanguageName } from "../types";
import { zh } from "./zh";
import { en } from "./en";
import { ja } from "./ja";
import { ko } from "./ko";
import { fr } from "./fr";

type Dict = Record<string, string>;

const dicts: Record<LanguageName, Dict> = { zh, en, ja, ko, fr };

export function getTranslator(language: LanguageName) {
  const dict = dicts[language] ?? zh;
  return (key: string) => dict[key] ?? key;
}
