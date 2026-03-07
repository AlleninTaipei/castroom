'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './page.module.css';
import { getDirectorPrompt } from './actions';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

type AspectRatio = '9:16' | '16:9' | '1:1';

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface Segment {
  start: number;
  end: number;
}

export default function Home() {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatHistoryRef = useRef<ChatMessage[]>([]);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isAiSpeaking = useRef(false);

  const volumeRef = useRef(0);
  const segments = useRef<Segment[]>([]);
  const currentSegmentStart = useRef<number | null>(null);
  const startTime = useRef<number>(0);
  const volumeThreshold = 0.02;

  const currentSubtitleRef = useRef<{type: 'User' | 'AI', text: string} | null>(null);

  const ffmpegRef = useRef<FFmpeg | null>(null);

  // 1. Initial Setup
  useEffect(() => {
    async function setup() {
      try {
        const constraints = {
          video: { width: 1280, height: 720, facingMode: 'user' },
          audio: true
        };
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);
        if (videoRef.current) videoRef.current.srcObject = newStream;

        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(newStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length / 255;
          volumeRef.current = average;
          requestAnimationFrame(checkVolume);
        };
        checkVolume();

        const drawCanvas = () => {
          if (canvasRef.current && videoRef.current && videoRef.current.readyState >= 2) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const cw = canvas.width, ch = canvas.height;
              const vw = video.videoWidth, vh = video.videoHeight;
              const canvasRatio = cw / ch, videoRatio = vw / vh;
              let sw, sh, sx, sy;
              if (videoRatio > canvasRatio) {
                sh = vh; sw = vh * canvasRatio; sx = (vw - sw) / 2; sy = 0;
              } else {
                sw = vw; sh = vw / canvasRatio; sx = 0; sy = (vh - sh) / 2;
              }
              ctx.clearRect(0, 0, cw, ch);
              ctx.save();
              ctx.translate(cw, 0); ctx.scale(-1, 1);
              ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
              ctx.restore();

              const sub = currentSubtitleRef.current;
              if (sub) {
                ctx.font = 'bold 24px sans-serif';
                ctx.textAlign = 'center';
                const text = `[${sub.type}] ${sub.text}`;
                const metrics = ctx.measureText(text);
                const maxWidth = cw * 0.8;
                const words = text.split('');
                let line = '', lines = [];
                for (let n = 0; n < words.length; n++) {
                  let testLine = line + words[n];
                  if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                    lines.push(line); line = words[n];
                  } else { line = testLine; }
                }
                lines.push(line);
                const lh = 32, bgH = lines.length * lh + 20, bgW = maxWidth + 40;
                const x = cw / 2, y = ch * 0.82;
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x - bgW/2, y - 25 - (lines.length - 1) * lh, bgW, bgH, 10); ctx.fill(); }
                else { ctx.fillRect(x - bgW/2, y - 25 - (lines.length - 1) * lh, bgW, bgH); }
                ctx.fillStyle = sub.type === 'User' ? '#4ade80' : '#60a5fa';
                for (let k = 0; k < lines.length; k++) {
                  ctx.fillText(lines[k], x, y + k * lh - (lines.length - 1) * lh / 2);
                }
              }
            }
          }
          requestAnimationFrame(drawCanvas);
        };
        drawCanvas();

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
        const ffmpeg = new FFmpeg();
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        ffmpegRef.current = ffmpeg;
      } catch (err) {
        console.error("DEBUG: Setup Error ->", err);
      }
    }

    if (typeof window !== 'undefined') {
      setup();
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.lang = 'zh-TW';
        recognitionRef.current.onresult = async (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          currentSubtitleRef.current = { type: 'User', text: transcript };
          if (isAiSpeaking.current) { window.speechSynthesis.cancel(); isAiSpeaking.current = false; }
          const aiResponse = await getDirectorPrompt(transcript, chatHistoryRef.current);
          const newHistory: ChatMessage[] = [
            ...chatHistoryRef.current, 
            { role: 'user', parts: [{ text: transcript }] }, 
            { role: 'model', parts: [{ text: aiResponse }] }
          ];
          setChatHistory(newHistory);
          chatHistoryRef.current = newHistory;
          speak(aiResponse);
        };
        recognitionRef.current.onend = () => isRecordingRef.current && recognitionRef.current.start();
      }
      synthRef.current = window.speechSynthesis;
    }
    return () => stream?.getTracks().forEach(track => track.stop());
  }, []);

  // 2. Segment Tracking
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      startTime.current = Date.now();
      interval = setInterval(() => {
        const now = (Date.now() - startTime.current) / 1000;
        const isUserSpeaking = volumeRef.current > volumeThreshold && !isAiSpeaking.current;
        if (isUserSpeaking && currentSegmentStart.current === null) {
          currentSegmentStart.current = now;
        } else if (!isUserSpeaking && currentSegmentStart.current !== null) {
          segments.current.push({ start: currentSegmentStart.current, end: now });
          currentSegmentStart.current = null;
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const speak = (text: string) => {
    if (!synthRef.current) return;
    currentSubtitleRef.current = { type: 'AI', text: text };
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-TW';
    utterance.onstart = () => { isAiSpeaking.current = true; };
    utterance.onend = () => { isAiSpeaking.current = false; };
    synthRef.current.speak(utterance);
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (currentSegmentStart.current !== null) {
        segments.current.push({ start: currentSegmentStart.current, end: (Date.now() - startTime.current) / 1000 });
      }
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
      recognitionRef.current?.stop();
      synthRef.current?.cancel();
    } else {
      if (!stream || !canvasRef.current) return;
      const canvasStream = canvasRef.current.captureStream(30);
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) canvasStream.addTrack(audioTrack);
      const recorder = new MediaRecorder(canvasStream, { mimeType: 'video/webm;codecs=vp9,opus' });
      mediaRecorderRef.current = recorder;
      setRecordedChunks([]);
      segments.current = [];
      setFinalVideoUrl(null);
      currentSubtitleRef.current = null;
      recorder.ondataavailable = (e) => e.data.size > 0 && setRecordedChunks(prev => [...prev, e.data]);
      recorder.start();
      setIsRecording(true);
      isRecordingRef.current = true;
      try { recognitionRef.current.start(); } catch (e) {}
    }
  };

  const resetRecording = () => {
    setRecordedChunks([]);
    segments.current = [];
    setFinalVideoUrl(null);
    currentSubtitleRef.current = null;
    setChatHistory([]);
    chatHistoryRef.current = [];
    alert("已清空錄製數據，您可以重新開始了！");
  };

  const downloadRawVideo = () => {
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `castroom_raw_${Date.now()}.webm`;
    a.click();
  };

  const processMagicCut = async () => {
    if (!ffmpegRef.current || recordedChunks.length === 0 || segments.current.length === 0) {
      alert("No speech detected!");
      return;
    }
    setIsProcessing(true);
    try {
      const ffmpeg = ffmpegRef.current;
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      await ffmpeg.writeFile('input.webm', await fetchFile(blob));
      let filter = "";
      segments.current.forEach((seg, i) => {
        filter += `[0:v]trim=start=${seg.start}:end=${seg.end},setpts=PTS-STARTPTS[v${i}];`;
        filter += `[0:a]atrim=start=${seg.start}:end=${seg.end},asetpts=PTS-STARTPTS[a${i}];`;
      });
      const concatInputs = segments.current.map((_, i) => `[v${i}][a${i}]`).join('');
      filter += `${concatInputs}concat=n=${segments.current.length}:v=1:a=1[outv][outa]`;
      await ffmpeg.exec(['-i', 'input.webm', '-filter_complex', filter, '-map', '[outv]', '-map', '[outa]', '-preset', 'ultrafast', '-c:v', 'libx264', '-crf', '28', 'output.mp4']);
      const data = await ffmpeg.readFile('output.mp4');
      setFinalVideoUrl(URL.createObjectURL(new Blob([(data as any).buffer], { type: 'video/mp4' })));
    } catch (err) { console.error(err); }
    finally { setIsProcessing(false); }
  };

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Castroom</h1>
      <div className={styles.controls}>
        {(['9:16', '16:9', '1:1'] as AspectRatio[]).map((r) => (
          <button key={r} className={`${styles.button} ${aspectRatio === r ? styles.active : ''}`} onClick={() => setAspectRatio(r)} disabled={isRecording}>
            {r}
          </button>
        ))}
      </div>
      <div className={`${styles.videoWrapper} ${aspectRatio === '9:16' ? styles.aspectRatio916 : aspectRatio === '16:9' ? styles.aspectRatio169 : styles.aspectRatio11}`}>
        <video ref={videoRef} autoPlay playsInline muted style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px' }} />
        <canvas ref={canvasRef} width={aspectRatio === '9:16' ? 405 : aspectRatio === '16:9' ? 1280 : 720} height={aspectRatio === '9:16' ? 720 : aspectRatio === '16:9' ? 720 : 720} style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }} />
        {isRecording && <div className={styles.status}><div className={styles.recordingDot} /><span>DIRECTOR LISTENING...</span></div>}
        <button className={`${styles.recordButton} ${isRecording ? styles.recording : ''}`} onClick={toggleRecording}><div className={styles.recordButtonInner} /></button>
      </div>
      <div className={styles.controls} style={{ marginTop: '2rem', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {!isRecording && recordedChunks.length > 0 && (
          <>
            <button className={styles.button} onClick={downloadRawVideo} style={{ borderColor: '#4ade80' }}>💾 快速轉存</button>
            <button className={styles.button} onClick={processMagicCut} disabled={isProcessing} style={{ borderColor: '#60a5fa' }}>{isProcessing ? '⏳ 處理中...' : '✨ 魔術剪輯'}</button>
            <button className={styles.button} onClick={resetRecording} style={{ borderColor: '#ff4d4d' }}>🔄 重新錄製</button>
          </>
        )}
        {finalVideoUrl && (
          <a href={finalVideoUrl} download="castroom_magic.mp4" className={styles.button} style={{ background: '#60a5fa', color: '#fff' }}>⬇️ 下載成品</a>
        )}
      </div>
    </main>
  );
}
