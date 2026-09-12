import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Smartphone,
  CheckCheck,
  Camera,
  FileCheck,
  ShieldCheck,
  Sparkles,
  MapPin,
  Clock,
  Radio,
  Image as ImageIcon,
} from "lucide-react";
import { DriverSmsMessage, Stop } from "../types/dwell";

interface DriverSmsCheckInHubProps {
  activeStop: Stop | null;
  onEvidenceAdded?: () => void;
}

export const DriverSmsCheckInHub: React.FC<DriverSmsCheckInHubProps> = ({
  activeStop,
  onEvidenceAdded,
}) => {
  const [messages, setMessages] = useState<DriverSmsMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedPhotoType, setSelectedPhotoType] = useState<"dock_stamp" | "signed_bol">("dock_stamp");
  const [isSending, setIsSending] = useState(false);
  const [driverPhone, setDriverPhone] = useState("+1 (479) 555-0199");
  const [truckUnit, setTruckUnit] = useState("Unit #104");

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/driver-sms");
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Failed to load SMS logs:", err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, []);

  // Trigger automated dispatch SMS when geofence entry occurs
  const handleTriggerGeofenceSms = async () => {
    setIsSending(true);
    try {
      const res = await fetch("/api/driver-sms/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stopId: activeStop?.id || "stop-wm-bentonville",
          phone: driverPhone,
          truckNumber: truckUnit,
        }),
      });
      if (res.ok) {
        await fetchMessages();
      }
    } finally {
      setIsSending(false);
    }
  };

  // Simulate driver replying with a photo from the cab
  const handleSimulateDriverReply = async (type: "dock_stamp" | "signed_bol") => {
    setIsSending(true);
    const photoUrl =
      type === "signed_bol"
        ? "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60"
        : "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60";

    const defaultMsg =
      type === "signed_bol"
        ? "Receiver clerk signed the bill. In-Gate stamp door 44 attached."
        : "Security guard stamped my gate pass at 14:05 UTC. Photo attached.";

    try {
      const res = await fetch("/api/driver-sms/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stopId: activeStop?.id || "stop-wm-bentonville",
          message: inputText.trim() || defaultMsg,
          mediaUrl: photoUrl,
          mediaType: type,
        }),
      });
      if (res.ok) {
        setInputText("");
        await fetchMessages();
        if (onEvidenceAdded) onEvidenceAdded();
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-[#080D18] rounded-2xl border border-white/10 p-4 sm:p-6 shadow-2xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-lime-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                Automated Driver SMS & WhatsApp Dispatch Hub
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-lime-400 text-slate-950">
                Twilio Webhook
              </span>
            </div>
            <p className="text-xs text-slate-400">
              When a truck enters the dock geofence, Dwell automatically prompts the driver via SMS to photograph dock stamps or BOLs.
            </p>
          </div>
        </div>

        {/* Action button to test geofence dispatch */}
        <button
          onClick={handleTriggerGeofenceSms}
          disabled={isSending}
          className="px-3.5 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-lime-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <Radio className="w-4 h-4 animate-pulse" />
          <span>{isSending ? "Dispatching..." : "Simulate Geofence SMS Trigger"}</span>
        </button>
      </div>

      {/* Target Facility & Driver Info Pill */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded-xl border border-white/5 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <MapPin className="w-4 h-4 text-lime-400" />
          <span className="text-slate-500 uppercase font-bold text-[10px]">Active Dock:</span>
          <span className="font-bold text-white truncate">
            {activeStop?.facilityName || "Walmart DC #6094"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Smartphone className="w-4 h-4 text-lime-400" />
          <span className="text-slate-500 uppercase font-bold text-[10px]">Driver Cell:</span>
          <span className="font-mono text-white">{driverPhone}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Clock className="w-4 h-4 text-lime-400" />
          <span className="text-slate-500 uppercase font-bold text-[10px]">Assigned Rig:</span>
          <span className="font-bold text-white">{truckUnit}</span>
        </div>
      </div>

      {/* Interactive SMS Messenger Simulation Window */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/90 overflow-hidden flex flex-col h-[400px]">
        {/* Messenger Header */}
        <div className="bg-[#0B1220] px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse"></div>
            <span className="text-xs font-bold text-white">APEX Fleet Telematics Dispatcher (Twilio # +1 800-555-DWELL)</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Encrypted Carrier Channel</span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
              <MessageSquare className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
              <span>No SMS messages logged yet. Click "Simulate Geofence SMS Trigger" to start.</span>
            </div>
          ) : (
            messages.map((m) => {
              const isOut = m.direction === "outgoing";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isOut ? "items-start" : "items-end"}`}
                >
                  <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                    <span>{isOut ? "APEX Automated Dispatch" : "Driver Mike (Cab)"}</span>
                    <span>•</span>
                    <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                      isOut
                        ? "bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none"
                        : "bg-lime-400 text-slate-950 font-medium rounded-tr-none shadow-md shadow-lime-500/10"
                    }`}
                  >
                    <p>{m.message}</p>
                    {m.mediaUrl && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-black/20 bg-black/40">
                        <img
                          src={m.mediaUrl}
                          alt="Driver Upload"
                          className="w-full h-32 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="p-1.5 text-[10px] font-bold flex items-center justify-between bg-black/60 text-white">
                          <span>{m.mediaType === "signed_bol" ? "📄 Signed BOL Photo" : "🏛️ In-Gate Stamp Photo"}</span>
                          <span className="text-lime-400">✓ Auto-Registered</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                    <CheckCheck className="w-3 h-3 text-lime-400" />
                    <span className="capitalize">{m.status}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Driver Reply Quick Action Bar */}
        <div className="bg-[#0B1220] p-3 border-t border-white/5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-slate-300">Simulate Driver Response:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedPhotoType("dock_stamp")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  selectedPhotoType === "dock_stamp"
                    ? "bg-lime-400 text-slate-950"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                In-Gate Stamp
              </button>
              <button
                type="button"
                onClick={() => setSelectedPhotoType("signed_bol")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  selectedPhotoType === "signed_bol"
                    ? "bg-lime-400 text-slate-950"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Signed BOL
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type driver reply or click quick-attach buttons..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
            />
            <button
              onClick={() => handleSimulateDriverReply(selectedPhotoType)}
              disabled={isSending}
              className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-lime-500/20 disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Send & Attach Photo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
