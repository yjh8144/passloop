# Bug Knowledge Base

Last updated: 2026-06-04

This knowledge base tracks fixed bugs, regression coverage, and newly discovered issues for the PassLoop maintenance loop.

## Regression Matrix

| Historical bug/fix | Regression case | Browser result | Status |
| --- | --- | --- | --- |
| `ce5bcc3` Restore selected options after reopening page in practice mode | Select answer B on the built-in test list, reload the page, verify B remains checked | B stayed checked after reload | Passed |
| `a3da2d5` Practice/editor correctness bugs | Submit correct single-choice answer, verify result chip, answer panel, stats, and next navigation | Correct result shown, stats updated, next navigation worked | Passed |
| `3537887` Harden practice state and add debug test list | Open Debug via seven brand clicks, enable Debug, create all-types test list | Created "测试题单（全题型）" with 10 questions | Passed |
| Wrong-practice state handling | Submit a wrong answer, enter wrong temporary page, re-answer correctly | Wrong question became re-answerable and cleared after correct retry | Passed |
| `a98e285` Restore last-viewed question in paper mode | Switch to paper mode and verify all cards render with prior submitted state intact | All 10 cards rendered; previous submitted answers stayed locked and visible | Passed |
| `4149c84` Empty-answer confirmation | In paper/unified-submit mode, click the bottom submit-all button with unanswered questions | Confirm dialog listed questions 3-10 and included "本次不再提示" | Passed |
| `fa5fc1b` Modal interaction consistency | Open import/debug/empty-submit dialogs and close with explicit cancel action | Dialogs closed without leaking state | Passed |
| `6ca04aa` Remote backup service and restore UI | POST upload/list/download/bad-password checks against the project URL | `/api/backups` on `http://121.40.35.52:9364` returned 404 | Not covered |

## Newly Discovered Bugs

### KB-2026-06-04-001: Manager chunk circular dependency warning

- Severity: Medium
- Source: `npm run build`
- Symptom: Vite/Rollup warned that `useDialog` was re-exported through `src/contexts/index.ts` while manager chunks and dialog context depend on each other. Rollup warns this can produce broken execution order between chunks.
- Fix: Import `useDialog` directly from `src/contexts/DialogContext.tsx` in manager components instead of through the context barrel.
- Regression case: Run `npm run build`; warning should not appear.

## Notes

- The first submit-all click hit the compact top button and did not visibly open the confirm dialog during browser automation. Retesting through the bottom `.paper-stack .submit-all-button` opened the expected dialog. Future regression scripts should cover both submit-all entry points explicitly.
- Remote backup regression needs the deployed backup service URL. The app host at `http://121.40.35.52:9364` serves the frontend, but does not expose `/api/backups`.
- The working tree already contains unrelated local changes and untracked helper files. Maintenance edits should stay tightly scoped and avoid reverting those changes.
