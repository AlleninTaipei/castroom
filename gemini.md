# Project: Castroom - AI Live Prompting Video Tool

## Context
"Castroom" is an application that transforms solo video recording into a two-way conversation using Gemini. It's built for creators who want to stay in the "flow" without staring at a static script.

## Core Vibe
- **Interactive:** The AI should feel like a live director or interviewer.
- **Seamless:** The transition from recording to "smart-cut" editing should be instant.
- **Minimalist:** Focus on the conversation, not complex UI settings.

## Technical Stack Requirements
- **LLM:** Gemini 1.5 Pro/Flash (via API or Vertex AI).
- **Video Processing:** FFmpeg (for silence removal and stitching).
- **Frontend:** React/Next.js with MediaRecorder API.
- **Audio:** Web Speech API or Gemini Multimodal Live API (for low latency).

## Implementation Instructions for Gemini

### 1. The Interaction Logic
- Create a recording interface that pipes real-time audio/text to Gemini.
- Gemini's persona: An encouraging interviewer or a creative brainstormer.
- In Voice Mode, handle the interrupt logic so the user can speak over the AI.

### 2. The "Remove Silence" Logic
- **Task:** Identify segments where the user is NOT speaking.
- **Rule:** If `audio_level < threshold` OR `speaker == AI`, mark segment for deletion.
- **Execution:** Use FFmpeg to `concat` the remaining clips into a single MP4.

### 3. Prompt Engineering for the "Director"
> "You are a creative video director. Listen to the user's input. If they pause, ask a follow-up question to keep them talking. If they seem stuck, provide a creative prompt. Keep responses concise to avoid making the video too long."

## Feature Milestones
- [ ] UI for Dimension selection (9:16, 16:9, 1:1).
- [ ] Real-time Audio streaming to Gemini.
- [ ] Video/Audio synchronization during recording.
- [ ] The "Magic Button": One-click silence/AI-part removal script.
