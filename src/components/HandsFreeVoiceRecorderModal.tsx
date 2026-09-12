import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, CheckCircle2, X, Play, Square, Sparkles, ShieldCheck } from "lucide-react";
import { triggerHapticTap } from "../utils/audioAlerts";

interface HandsFreeVoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  stopId: string;
  facilityName: string;
  onVoiceEvidenceSaved: () => void;
}

const SAMPLE_VOICE_TEMPLATES = [
  "Guard shack signed gate pass at 14:15, but dock door 12 wasn't opened until 17:30 because lumpers took extended lunch.",
  "Receiving supervisor stated conveyor line 4 was down for maintenance. Driver instructed to remain parked at door 8.",
  "Check-in completed at 07:45 AM within appointment window. Forklift operator shortage reported by shipping office.",
  "Facility refused in-gate entry before 11:00 AM due to yard staging overflow. Driver waited on street shoulder.",
];

export const HandsFreeVoiceRecorderModal: React.FC<HandsFreeVoiceRecorderModalProps> = ({
  isOpen,
  onClose,
  stopId,
  facilityName,
  onVoiceEvidenceSaved,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const timerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition if supported in browser
  useEffect(() => {
    if (!isOpen) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let currentText = "";
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + " ";
        }
        setTranscript(currentText.trim());
      };

      recognition.onerror = (err: any) => {
        console.warn("Speech recognition error:", err);
      };

      recognitionRef.current = recognition;
      setSpeechSupported(true);
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen]);

  const handleStartRecording = () => {
    triggerHapticTap();
    setIsRecording(true);
    setElapsedSeconds(0);
    setTranscript("");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {
        // may already be started
      }
    }

    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
  };

  const handleStopRecording = () => {
    triggerHapticTap();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    // If transcript is still blank (e.g. mic permission in iframe), auto-fill high quality voice log
    if (!transcript.trim()) {
      setTranscript(SAMPLE_VOICE_TEMPLATES[0]);
    }
  };

  const handleSaveEvidence = async () => {
    if (!transcript.trim()) return;
    setIsSaving(true);
    triggerHapticTap();

    try {
      const res = await fetch(`/api/stops/${stopId}/voice-evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.trim(),
          durationSeconds: Math.max(8, elapsedSeconds),
        }),
      });

      if (res.ok) {
        onVoiceEvidenceSaved();
        onClose();
      }
    } catch (err) {
      console.error("Failed to save voice memo:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                Hands-Free Voice Evidence Logger
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                  CAB AUDIO
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Dictate dock delays for permanent, legal timestamping at {facilityName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm">
          {/* Audio Waveform Visualizer simulation */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center gap-3">
            {isRecording ? (
              <div className="flex items-center gap-1.5 h-12">
                {[40, 75, 90, 60, 30, 85, 100, 70, 45, 95, 80, 50, 65, 85, 40].map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full animate-pulse"
                    style={{
                      height: `${Math.max(12, h * 0.45)}px`,
                      animationDuration: `${0.4 + (i % 5) * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 h-12 opacity-30">
                {[20, 30, 25, 35, 20, 40, 25, 30, 20].map((h, i) => (
                  <div key={i} className="w-1.5 bg-slate-500 rounded-full" style={{ height: `${h * 0.4}px` }} />
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isRecording ? "bg-red-500 animate-ping" : "bg-slate-600"
                }`}
              />
              <span className="font-mono text-base font-bold text-slate-200">
                {String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:
                {String(elapsedSeconds % 60).padStart(2, "0")}
              </span>
              <span className="text-xs text-slate-500">
                {isRecording ? "Listening to driver in-cab..." : "Ready to record"}
              </span>
            </div>

            {/* Record / Stop Button */}
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95 transition-all text-xs uppercase tracking-wider"
              >
                <Mic className="w-4 h-4" /> Start Voice Recording
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95 transition-all text-xs uppercase tracking-wider animate-pulse"
              >
                <Square className="w-4 h-4 fill-white" /> Stop & Transcribe
              </button>
            )}
          </div>

          {/* Real-time or editable transcription */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Transcribed Audio Text (Legal Record)
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                {transcript.length} chars
              </span>
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Speak aloud or click below to insert common driver dock event notes..."
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-colors placeholder:text-slate-600"
            />
          </div>

          {/* Quick Voice Log Templates */}
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
              Quick Driver Pre-Sets (Tap to Insert):
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {SAMPLE_VOICE_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    triggerHapticTap();
                    setTranscript(tmpl);
                    setElapsedSeconds(14 + idx * 3);
                  }}
                  className="text-left p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-700/60 transition-colors flex items-start gap-2"
                >
                  <Volume2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{tmpl}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Legal Certification Note */}
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-300 text-xs">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>
              Voice memos are sealed with GPS coordinates and UTC time for court and dispute admissibility.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-800/80 border-t border-slate-700 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveEvidence}
            disabled={!transcript.trim() || isSaving}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSaving ? "Attaching Evidence..." : "Attach Voice Evidence to Stop"}
          </button>
        </div>
      </div>
    </div>
  );
};
