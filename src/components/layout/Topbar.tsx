import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown, Languages, Palette, Plus, Search, Settings2, Trash2 } from "lucide-react"
import type { AppData, QuestionList } from "../../lib/types"
import { ControlPanel } from "../practice/ControlPanel"
import type { Page } from "../../hooks/types"
import { useT } from "../../contexts"

export function Topbar(props: {
  page: Page
  query: string
  setQuery: (value: string) => void
  data: AppData
  updateSettings: (patch: Partial<AppData["settings"]>) => void
  activeList: QuestionList
  lists: QuestionList[]
  setActiveListId: (id: string) => void
  createList: () => void
  deleteList: (id: string) => void
  onClearListAttempts?: () => void
  hasAttempts?: boolean
}) {
  const t = useT()
  const [showSettings, setShowSettings] = useState(false)
  const [showListPicker, setShowListPicker] = useState(false)
  const [showSearchOverlay, setShowSearchOverlay] = useState(false)
  const [localQuery, setLocalQuery] = useState(props.query)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const overlayInputRef = useRef<HTMLInputElement>(null)
  const localQueryRef = useRef(localQuery)
  const showSearch = props.page === "practice" || props.page === "wrong"
  const showSettingsButton = props.page === "practice" || props.page === "wrong"

  useEffect(() => {
    localQueryRef.current = localQuery
  })

  const [prevPropQuery, setPrevPropQuery] = useState(props.query)
  if (props.query !== prevPropQuery) {
    setPrevPropQuery(props.query)
    setLocalQuery(props.query)
  }

  const [prevShowSearch, setPrevShowSearch] = useState(showSearch)
  if (!showSearch && prevShowSearch) {
    setPrevShowSearch(showSearch)
    setShowSearchOverlay(false)
  } else if (showSearch !== prevShowSearch) {
    setPrevShowSearch(showSearch)
  }

  const { setQuery } = props

  const flushAndClose = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    setQuery(localQueryRef.current)
    setShowSearchOverlay(false)
  }, [setQuery])

  const onOverlayInput = useCallback(
    (value: string) => {
      setLocalQuery(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setQuery(value)
        debounceRef.current = null
      }, 500)
    },
    [setQuery],
  )

  useEffect(() => {
    if (!showSearchOverlay) return
    overlayInputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") flushAndClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [showSearchOverlay, flushAndClose])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const closeListPicker = useCallback(() => setShowListPicker(false), [])
  const closeSettings = useCallback(() => setShowSettings(false), [])

  useEffect(() => {
    if (!showListPicker) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeListPicker()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [showListPicker, closeListPicker])

  useEffect(() => {
    if (!showSettings) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSettings()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [showSettings, closeSettings])

  return (
    <header className="topbar">
      {showSearch && (
        <>
          <div className="search-box">
            <Search size={17} />
            <input
              value={props.query}
              onChange={(event) => props.setQuery(event.target.value)}
              placeholder={t("questionSearch")}
            />
          </div>
          <button className="search-trigger icon-button" onClick={() => setShowSearchOverlay(true)}>
            <Search size={17} />
          </button>
          {showSearchOverlay && (
            <>
              <div className="search-overlay-backdrop" onClick={flushAndClose} />
              <div className="search-overlay">
                <Search size={17} />
                <input
                  ref={overlayInputRef}
                  value={localQuery}
                  onChange={(e) => onOverlayInput(e.target.value)}
                  placeholder={t("questionSearch")}
                />
              </div>
            </>
          )}
        </>
      )}
      <div className="list-picker-wrap">
        <button className="list-picker-trigger" onClick={() => setShowListPicker((v) => !v)}>
          <span className="list-picker-name">{props.activeList.name}</span>
          <span className="list-picker-count">
            {props.activeList.questions.length} {t("questionCount")}
          </span>
          <ChevronDown
            size={15}
            className={`list-picker-chevron ${showListPicker ? "is-open" : ""}`}
          />
        </button>
        {showListPicker && (
          <>
            <div className="list-picker-backdrop" onClick={closeListPicker} />
            <div className="list-picker-dropdown">
              <div className="list-picker-items">
                {props.lists.map((list) => (
                  <div
                    key={list.id}
                    className={`list-picker-item ${list.id === props.activeList.id ? "active" : ""}`}
                  >
                    <button
                      className="list-picker-item-main"
                      onClick={() => {
                        props.setActiveListId(list.id)
                        closeListPicker()
                      }}
                    >
                      <span className="list-picker-item-name">{list.name}</span>
                      <span className="list-picker-item-count">
                        {list.questions.length} {t("questionCount")}
                      </span>
                    </button>
                    {props.lists.length > 1 && (
                      <button
                        className="list-picker-item-delete"
                        title={t("deleteList")}
                        onClick={(e) => {
                          e.stopPropagation()
                          closeListPicker()
                          props.deleteList(list.id)
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                className="list-picker-add"
                onClick={() => {
                  props.createList()
                  closeListPicker()
                }}
              >
                <Plus size={15} /> {t("addList")}
              </button>
            </div>
          </>
        )}
      </div>
      <div className="topbar-actions">
        <label className="select-label">
          <Palette size={16} />
          <select
            value={props.data.settings.theme}
            onChange={(event) =>
              props.updateSettings({ theme: event.target.value as AppData["settings"]["theme"] })
            }
          >
            <option value="mint">Mint</option>
            <option value="paper">Paper</option>
            <option value="lavender">Lavender</option>
            <option value="ocean">Ocean</option>
            <option value="rose">Rose</option>
            <option value="night">Night</option>
            <option value="nord">Nord</option>
          </select>
        </label>
        <label className="select-label">
          <Languages size={16} />
          <select
            value={props.data.settings.language}
            onChange={(event) =>
              props.updateSettings({
                language: event.target.value as AppData["settings"]["language"],
              })
            }
          >
            <option value="zh">中文</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
            <option value="fr">Français</option>
          </select>
        </label>
        {showSettingsButton && (
          <div className="topbar-settings-wrap">
            <button
              className="icon-button"
              title={t("practiceSettings")}
              onClick={() => setShowSettings((v) => !v)}
            >
              <Settings2 size={17} />
            </button>
            {showSettings && (
              <div className="topbar-settings-dropdown">
                <ControlPanel
                  settings={props.data.settings}
                  updateSettings={props.updateSettings}
                  onClearListAttempts={props.onClearListAttempts}
                  hasAttempts={props.hasAttempts}
                />
              </div>
            )}
            {showSettings && (
              <div className="topbar-settings-backdrop" onClick={() => setShowSettings(false)} />
            )}
          </div>
        )}
      </div>
    </header>
  )
}
