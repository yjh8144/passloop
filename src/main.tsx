import React from "react"
import ReactDOM from "react-dom/client"
import { App } from "./App"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { safeSetStorageItem } from "./utils/safeStorage"
import "./styles/app.css"

safeSetStorageItem("local", "passloop.app.version", __APP_VERSION__)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
