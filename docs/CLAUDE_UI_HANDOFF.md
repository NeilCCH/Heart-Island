# Claude Code｜直接接續UI

使用者已授權兩個AI快點完成，Gate1/Gate2實作開始。Codex核心已具備實作，請從feature/energy-core的最新提交建立/更新獨立feature/energy-ui分支；不要只從main開始（main尚無核心）。不要修改core/settings，App最小入口現在交給UI。

先讀README、PRD、CORE_API_CONTRACT、CODEX_CROSS_REVIEW、DECISIONS、GATE0_UI_PROPOSAL_ClaudeCode。具體範圍：src/features/energy/ui/、src/App.tsx與UI元件測試。套件與核心已準備，不另裝狀態庫/路由/字型CDN。

真正API：core/useEnergySession.ts的useEnergySession(settings,{onEffects})；settings/useEnergySettings.ts的useEnergySettings()回傳settings/update/remember/setRemember/clearSaved/resetToDefaults/storageError。型別在core/types.ts。UI測試可注入tests/fakeRuntime.ts，禁止另寫假計數規則。

完成home/guiding/paused/setComplete/rest/readyNext/settings。功能根hook不卸載；所有時間/計數只讀core。用settings.update({pace})調速；本循環保持cyclePace，下一循環pendingPace生效。設定重設不動本組目標及目前休息。clearSaved會同時remember=false，不重設記憶體。

使用public/assets/cat/original.png（核准的正面裁切圖，無標籤），靜態contain、不生成或3D。視覺霧白/深藍/藍灰，無綠色基底、低刺激、手機優先、深色與低動態。大字自然吐氣/吸氣提示，示範限定輕量彎舉，安全說明清楚。文字只用已引導X次，不假稱真實運動次數。

聲音必須使用者主動開啟；只有柔和音，不用語音。依onEffects播放有效當下提示；guidancePaused為取消，mode為暫停/完成/idle時取消所有音訊及釋放WakeLock，pausedRest也須處理。WakeLock請求promise需身份檢查，避免離開後晚到取得鎖。背景與回前景不得自動恢復聲音/引導。

補焦點管理、設定modal焦點鎖及回復、鍵盤操作、polite精簡播報，倒數不aria-live。減少動態取設定或系統OR，傳給核心有效reducedMotion，避免每render製造不穩定設定引用。

交付時執行npm test及npm run build；Playwright本機沙箱無法啟動，需正常終端重跑，不能宣稱通過。main合併與部署須使用者驗收。請直接完成，不再要求使用者重複確認既有決策。
