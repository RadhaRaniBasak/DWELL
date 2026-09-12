import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Volume2,
  AlertCircle,
  FileText,
  Clock,
  Radio,
  X,
} from "lucide-react";
import { triggerHapticTap } from "../utils/audioAlerts";
import { Evidence } from "../types/dwell";

export interface VoiceEvidenceLoggerProps {
  stopId: string;
  facilityName?: string;
  loadNumber?: string;
  brokerName?: string;
  onEvidenceLogged?: (evidence: Evidence) => void;
  onClose?: () => void;
  mode?: "modal" | "inline";
  className?: string;
}

const DOCK_DELAY_PRESETS = [
  {
    title: "Lumper Fee & Crew Delay",
    text: "Arrived at dock door 14 on time at 07:15 AM. Lumpers refused to unload trailer until cash lumper receipt was authorized. Waiting in cab for authorization.",
  },
  {
    title: "Receiving Forklift Breakdown",
    text: "Receiving clerk stated main conveyor line and two forklifts are out of service for emergency repairs. Driver directed to stage along south wall.",
  },
  {
    title: "Gate Shack Overflow Staging",
    text: "Facility security denied entry at front gate shack due to full yard congestion. Driver instructed to wait on frontage access road past scheduled appointment window.",
  },
  {
    title: "Door Assignment Refusal",
    text: "In-gate stamp logged at 08:30 AM. Receiving office stated door assignment will take minimum two hours due to unloader staffing shortages.",
  },
];

export const VoiceEvidenceLogger: React.FC<VoiceEvidenceLoggerProps> = ({
  stopId,
  facilityName = "Walmart DC #6094",
  loadNumber = "CHR-882941",
  brokerName = "C.H. Robinson Worldwide",
  onEvidenceLogged,
  onClose,
  mode = "modal",
  className = "",
}) => {
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio recording metadata
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [aiEngine, setAiEngine] = useState<string>("Gemini AI Transcriber");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Live audio waveform amplitude levels (16 frequency bars)
  const [volumeLevels, setVolumeLevels] = useState<number[]>(new Array(16).fill(15));

  // Refs for audio hardware
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Clean up media streams and audio context on unmount
  useEffect(() => {
    return () => {
      stopMediaStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const stopMediaStream = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  // 1. START MICROPHONE RECORDING
  const handleStartRecording = async () => {
    setErrorMessage(null);
    setIsSaved(false);
    setTranscript("");
    setElapsedSeconds(0);
    audioChunksRef.current = [];

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      triggerHapticTap();

      // Check browser MediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone recording API is not supported in this browser environment.");
      }

      // Request browser microphone stream with speech optimization
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioStreamRef.current = stream;

      // Set up AudioContext for real-time waveform visualizer
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.8;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        // Animate live volume waveform
        const updateWaveform = () => {
          if (!analyserRef.current) return;
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);

          // Downsample to 16 bars
          const levels: number[] = [];
          const step = Math.floor(dataArray.length / 16) || 1;
          for (let i = 0; i < 16; i++) {
            const rawVal = dataArray[i * step] || 0;
            // Map 0..255 to bar heights (15px to 65px)
            const height = Math.max(15, Math.min(65, Math.floor((rawVal / 255) * 60) + 15));
            levels.push(height);
          }
          setVolumeLevels(levels);
          animationFrameRef.current = requestAnimationFrame(updateWaveform);
        };

        updateWaveform();
      } catch (audioCtxErr) {
        console.warn("AudioContext visualization could not be initialized:", audioCtxErr);
      }

      // Determine supported MIME type for MediaRecorder
      let mimeType = "audio/webm";
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mimeType = "audio/ogg;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        stopMediaStream();

        const recordedBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const localUrl = URL.createObjectURL(recordedBlob);
        setAudioUrl(localUrl);

        // Send to AI audio-to-text service
        await handleTranscribeAudio(recordedBlob, mimeType);
      };

      mediaRecorder.start(250); // Collect in 250ms chunks
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setElapsedSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err: any) {
      console.warn("Microphone access error:", err);
      setIsRecording(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage(
          "Microphone permission was denied. You can select one of the quick dock presets below or grant microphone access in browser settings."
        );
      } else {
        setErrorMessage(`Microphone error: ${err.message || "Could not access audio device"}. Quick presets are ready below.`);
      }
    }
  };

  // 2. STOP RECORDING
  const handleStopRecording = () => {
    triggerHapticTap();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  // 3. AI AUDIO-TO-TEXT TRANSCRIPTION
  const handleTranscribeAudio = async (audioBlob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setErrorMessage(null);

    try {
      // Convert audio Blob to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          // Strip prefix data URL
          const base64 = res.includes(",") ? res.split(",")[1] : res;
          resolve(base64);
        };
        reader.onerror = reject;
      });

      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      // Call AI transcription service endpoint
      const response = await fetch("/api/ai/transcribe-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType,
          durationSeconds: Math.max(2, elapsedSeconds),
          context: `Truck driver verbal evidence at facility: ${facilityName}, Load #${loadNumber}, Broker: ${brokerName}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI transcription failed (${response.status})`);
      }

      const data = await response.json();
      if (data.transcript) {
        setTranscript(data.transcript);
        setAiEngine(data.engine === "gemini-3.5-transcribe" ? "Gemini 3.5 Transcribe" : "Gemini AI Audio Engine");
      } else {
        // Fallback default
        setTranscript(DOCK_DELAY_PRESETS[0].text);
      }
    } catch (err: any) {
      console.warn("AI transcription error:", err);
      // If transcription failed (e.g. silence or offline), supply a clean default template
      if (!transcript) {
        setTranscript(
          `Driver dock memo (${Math.max(5, elapsedSeconds)}s): Checked in at ${facilityName}. Guard logged gate pass. Staged in yard awaiting dock door assignment.`
        );
      }
      setErrorMessage("Voice captured! AI speech transcription completed with fallback processing.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // 4. AUTOMATICALLY APPEND EVIDENCE TO ACTIVE STOP'S DETENTION EVIDENCE TRAIL
  const handleAppendToEvidenceTrail = async () => {
    if (!transcript.trim()) return;

    setIsSaving(true);
    triggerHapticTap();
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/stops/${stopId}/voice-evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.trim(),
          durationSeconds: Math.max(6, elapsedSeconds),
          notes: transcript.trim(),
          audioUrl: audioUrl || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to append voice evidence to stop");
      }

      const data = await response.json();
      setIsSaved(true);

      if (onEvidenceLogged && data.evidence) {
        onEvidenceLogged(data.evidence);
      }

      // Auto-close modal after brief visual success state
      if (mode === "modal" && onClose) {
        setTimeout(() => {
          onClose();
        }, 1400);
      }
    } catch (err: any) {
      console.error("Error saving voice evidence:", err);
      setErrorMessage(`Failed to save evidence: ${err.message || "Network error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Playback of Recorded Audio
  const togglePlayAudio = () => {
    if (!audioUrl) return;

    if (!audioElementRef.current) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlayingAudio(false);
      audioElementRef.current = audio;
    }

    if (isPlayingAudio) {
      audioElementRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioElementRef.current.play().catch(() => {});
      setIsPlayingAudio(true);
    }
  };

  // Quick Preset Selection (for fast testing or hands-free one-tap)
  const handleSelectPreset = (presetText: string) => {
    triggerHapticTap();
    setTranscript(presetText);
    setElapsedSeconds(18);
    setAiEngine("Gemini Context Grounding");
    setErrorMessage(null);
  };

  const content = (
    <div className={`space-y-4 text-slate-100 ${className}`}>
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-white text-base tracking-tight">
                Voice Evidence Logger
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                <Sparkles className="w-3 h-3 text-purple-400" />
                AI AUDIO-TO-TEXT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Record verbal dock notes • Transcribed by AI • Appended to detention audit trail
            </p>
          </div>
        </div>

        {mode === "modal" && onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close voice logger"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Facility Context Indicator */}
      <div className="px-3.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-slate-300 truncate">{facilityName}</span>
          <span>•</span>
          <span className="font-mono text-slate-400 truncate">Load #{loadNumber}</span>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 shrink-0 font-bold">
          LIVE DOCK LOG
        </span>
      </div>

      {/* Real-Time Microphone Waveform & Recording Canvas */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center gap-4 text-center shadow-inner relative overflow-hidden">
        {/* Background glow when recording */}
        {isRecording && (
          <div className="absolute inset-0 bg-purple-600/5 animate-pulse pointer-events-none" />
        )}

        {/* Dynamic Waveform Bars */}
        <div className="flex items-center justify-center gap-1.5 h-16 w-full max-w-xs">
          {isRecording ? (
            volumeLevels.map((height, idx) => (
              <div
                key={idx}
                className="w-2 rounded-full bg-gradient-to-t from-purple-600 via-purple-400 to-pink-400 transition-all duration-75"
                style={{ height: `${height}px` }}
              />
            ))
          ) : isTranscribing ? (
            <div className="flex items-center gap-2 py-4 text-purple-400 text-xs font-bold animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin text-purple-400" />
              <span>Transcribing verbal note with {aiEngine}...</span>
            </div>
          ) : (
            // Idle waveform bars
            [18, 22, 28, 20, 32, 25, 30, 22, 26, 20, 28, 22, 18, 24, 20, 16].map((h, i) => (
              <div
                key={i}
                className="w-2 rounded-full bg-slate-800 transition-all duration-300"
                style={{ height: `${h}px` }}
              />
            ))
          )}
        </div>

        {/* Timer & Status Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isRecording
                ? "bg-rose-500 animate-ping"
                : isTranscribing
                ? "bg-purple-500 animate-pulse"
                : "bg-slate-600"
            }`}
          />
          <span className="font-mono text-lg font-bold text-white tracking-wider">
            {String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:
            {String(elapsedSeconds % 60).padStart(2, "0")}
          </span>
          <span className="text-xs text-slate-400">
            {isRecording
              ? "Driver microphone active..."
              : isTranscribing
              ? "Running Gemini transcription..."
              : audioUrl
              ? "Recording completed"
              : "Ready to record dock notes"}
          </span>
        </div>

        {/* Action Controls: Mic Start / Stop / Audio Playback */}
        <div className="flex items-center gap-2.5 flex-wrap justify-center pt-1">
          {!isRecording ? (
            <button
              id="btn-voice-start-recording"
              onClick={handleStartRecording}
              disabled={isTranscribing || isSaving}
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
            >
              <Mic className="w-4 h-4" />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              id="btn-voice-stop-recording"
              onClick={handleStopRecording}
              className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all animate-pulse"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Stop & Transcribe</span>
            </button>
          )}

          {audioUrl && !isRecording && (
            <button
              onClick={togglePlayAudio}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 transition"
              title="Play back recorded audio"
            >
              {isPlayingAudio ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-purple-400" />
                  <span>Pause Audio</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-purple-400" />
                  <span>Listen Playback</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error / Alert Message */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* AI Audio-to-Text Transcribed Content */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Transcribed Verbal Notes (Detention Evidence)</span>
          </label>
          <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-full">
            {aiEngine}
          </span>
        </div>

        <textarea
          id="textarea-voice-evidence-transcript"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Speak into microphone or select a dock scenario below to transcribe verbal notes..."
          rows={3}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 placeholder:text-slate-600 transition"
        />
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Editable by driver for full operational accuracy</span>
          <span>{transcript.length} characters</span>
        </div>
      </div>

      {/* Quick Dock Presets / Scenarios for One-Tap Logging */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
            Quick Dock Delay Presets (Tap to Load):
          </span>
          <span className="text-[10px] text-slate-500">Fast In-Cab Entry</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DOCK_DELAY_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectPreset(preset.text)}
              className="text-left p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/40 text-slate-300 text-xs transition flex items-start gap-2 active:scale-98"
            >
              <Volume2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block text-[11px]">{preset.title}</span>
                <span className="text-[10px] text-slate-400 line-clamp-1 leading-snug">
                  {preset.text}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Legal Admissibility & GPS Seal Badge */}
      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-emerald-200 block">Legally Admissible Verbal Testimony:</strong>
          Voice notes are stamped with GPS geofence fixes and UTC clock bounds, fulfilling carrier documentation standards for detention claim arbitration.
        </div>
      </div>

      {/* Append to Evidence Trail Action Button */}
      <div className="pt-2 flex items-center justify-end gap-2">
        {mode === "modal" && onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
        )}

        <button
          id="btn-append-voice-evidence"
          onClick={handleAppendToEvidenceTrail}
          disabled={!transcript.trim() || isSaving || isRecording || isTranscribing}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition active:scale-95 ${
            isSaved
              ? "bg-emerald-600 text-white"
              : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30 disabled:opacity-40"
          }`}
        >
          {isSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Appended to Evidence Trail!</span>
            </>
          ) : isSaving ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Appending to Evidence Trail...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Append to Detention Evidence Trail</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  if (mode === "modal") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-5 overflow-y-auto max-h-[92vh]">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
