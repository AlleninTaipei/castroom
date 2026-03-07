# 🎬 Castroom: 讓錄影成為一場對話

> **"不再孤獨面對鏡頭，讓 AI 成為你的現場導演。"**

Castroom 是一個將「單向錄影」轉化為「雙向對話」的創新工具。我們相信，最好的創作發生在「心流 (Flow)」之中。透過 **Gemini 1.5 Pro/Flash** 的強大即時理解能力，Castroom 讓你不再只是對著冷冰冰的機器講話，而是與一位充滿創意的導演共同創作。

---

## 🌟 核心價值 (Core Values)

- **互動優先 (Interactive)**：AI 不只是工具，更是你的靈感夥伴。在你停頓時給予導引，在你卡關時給予鼓勵。
- **無縫體驗 (Seamless)**：從按下錄影到完成剪輯，一切都在瀏覽器內完成。複雜的後製邏輯被簡化為一個「魔法按鈕」。
- **極簡主義 (Minimalist)**：專注於內容與對話，沒有複雜的設定，只有最直覺的創作空間。

---

## 🔥 Vibe Coding: 誰說開發很難？

本專案是透過 **Gemini CLI** 以 **Vibe Coding** 的模式開發而成。

**給 AI 小白的話：**
這不僅是一個影音工具，更是一個「勇敢嘗試」的證明。我們不再需要受限於繁瑣的程式語法，而是專注於「意圖 (Intent)」與「創意」。只要你有想法，AI 就是你的首席工程師。
- **不用怕出錯**：報錯只是優化的起點。
- **直覺開發**：用對話取代刻板的開發流程。
- **快速成型**：從點子到可運作的原型，就在幾次對話之間。

---

## ✨ 強大功能

- **🤖 AI 導演監製**：搭載 `gemini-3-flash-preview`，提供最即時的語音互動與創意引導。
- **🖋️ 實時字幕燒錄**：採用 Canvas 錄製技術，將 User 與 AI 的對話即時燒錄進影片畫面，無需後製。
- **🪄 Magic Cut (魔術剪輯)**：內建 FFmpeg WASM 技術，一鍵自動去除沈默片段與 AI 引導聲，只留下你的精采瞬間。
- **📐 多比例支援**：完美適配 9:16 (Shorts/TikTok)、16:9 (YouTube) 及 1:1 (Instagram)。

---

## 🚀 快速開始

### 1. 取得通行證
前往 [Google AI Studio](https://aistudio.google.com/) 取得免費的 Gemini API Key。

### 2. 環境設定
在根目錄建立 `.env.local` 檔案：
```env
GEMINI_API_KEY=你的金鑰
```

### 3. 啟動創作空間
```bash
npm install
npm run dev
```
打開瀏覽器訪問 `http://localhost:3000`，開始你的第一場 AI 導演之旅！

---

## 🛠️ 技術堆疊
- **Frontend**: Next.js (App Router)
- **AI**: Google Gemini SDK (`gemini-3-flash-preview`)
- **Video**: MediaRecorder API + Canvas Capture
- **Processing**: FFmpeg WASM (WebAssembly)
- **Style**: Pure CSS Modules

---

**Castroom** —— 讓我們一起，用 Vibe 寫程式，用對話拍影片。🚀
