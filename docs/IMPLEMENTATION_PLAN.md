# 實作分工與檔案計畫
狀態：未授權實作。

## 建議順序
1. 使用者裁決DECISIONS待決項，凍結共享契約。
2. Gate 1：Codex建立最小骨架、核心與測試adapter；交付測試證據。
3. Gate 2：Claude Code建立UI，不另寫計時器；接線前可使用同契約adapter。
4. Gate 3：整合核心、審查API使用、E2E與真機驗證。
5. Gate 4：交付demo及驗收資料，由使用者核准合併/部署。

## 所有權
| 檔案 | 建議負責人 |
|---|---|
| package.json、index.html、tsconfig、vite/vitest/playwright設定、src/main.tsx | Codex，需新增授權 |
| src/App.tsx | Codex最小入口後移交Claude Code；不可同時修改 |
| src/features/energy/core/types.ts、machine.ts、timing.ts、controller.ts、useEnergySession.ts | Codex |
| src/features/energy/settings/preferences.ts、useEnergySettings.ts | Codex |
| src/features/energy/tests/核心、hook與流程測試 | Codex |
| src/features/energy/ui/、UI元件測試、樣式、焦點、音訊 | Claude Code |
| docs/契約與決策 | 指定單一編輯者後更新，雙方審查 |

工具建議：Vite+React+TypeScript；Vitest（核心Node/React jsdom）、Testing Library、Playwright（Chromium/WebKit）。不新增狀態管理/路由庫。鎖定依賴版本及安裝只在授權後進行，目前沒有安裝或驗證。

## 協作
預計核心分支feature/energy-core、UI分支feature/energy-ui；Git repo 已存在（NeilCCH/Heart-Island），上述分支尚未建立。依工作流使用獨立checkout/worktree，但需先有Git基準。共享契約先交叉審查，不同檔案並行；合併及部署由使用者授權。

## 回退
實作後以獨立feature提交及入口隔離；回退時移除功能入口或還原對應提交。現階段沒有可回退的程式變更，也沒有任何部署。
