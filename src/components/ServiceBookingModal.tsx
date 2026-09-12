import React, { useState } from "react";
import {
  Wrench,
  X,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { MiningTruck, ServiceWorkOrder } from "../types/miningFleet";
import { triggerHapticTap } from "../utils/audioAlerts";

interface ServiceBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  truck: MiningTruck;
  onBookService: (newOrder: ServiceWorkOrder) => void;
}

export const ServiceBookingModal: React.FC<ServiceBookingModalProps> = ({
  isOpen,
  onClose,
  truck,
  onBookService,
}) => {
  const [category, setCategory] = useState<ServiceWorkOrder["category"]>("hydraulic");
  const [urgency, setUrgency] = useState<ServiceWorkOrder["urgency"]>("moderate");
  const [serviceBay, setServiceBay] = useState<string>("Bay 3 — Main Pit Workshop");
  const [title, setTitle] = useState<string>("Hydraulic Hoist System & Cylinder Seal Inspection");
  const [notes, setNotes] = useState<string>(
    "Driver reported slight delay in dump bed cycle time during ore drop at Hopper #4."
  );
  const [scheduledTime, setScheduledTime] = useState<string>("Today at 15:30 (Shift Handover)");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [createdOrder, setCreatedOrder] = useState<ServiceWorkOrder | null>(null);

  if (!isOpen) return null;

  const categories = [
    { id: "hydraulic", label: "Hydraulics & Hoist", icon: "💧" },
    { id: "tires", label: "Tires & TPMS", icon: "🛞" },
    { id: "brakes", label: "Brakes & Retarder", icon: "🛑" },
    { id: "engine", label: "Diesel Engine", icon: "⚙️" },
    { id: "transmission", label: "Transmission", icon: "⚡" },
    { id: "pm_inspection", label: "Scheduled PM", icon: "📋" },
  ] as const;

  const bays = [
    "Bay 1 — Tire Manipulator Bay",
    "Bay 2 — Heavy Engine Lift Bay",
    "Bay 3 — Main Pit Workshop",
    "Mobile Field Support Truck #02",
  ];

  const handleSelectCategory = (cat: ServiceWorkOrder["category"]) => {
    triggerHapticTap();
    setCategory(cat);
    if (cat === "hydraulic") {
      setTitle("Hydraulic Hoist System & Cylinder Seal Inspection");
    } else if (cat === "tires") {
      setTitle("53/80R63 Gigantic Haul Tire Pressure Calibration");
    } else if (cat === "brakes") {
      setTitle("Oil-Cooled Front/Rear Disc Brake Wear Assessment");
    } else if (cat === "engine") {
      setTitle("Tier 4 High-Pressure Diesel Injection & Oil Filter Flush");
    } else if (cat === "transmission") {
      setTitle("Electronic Clutch Pressure & Planetary Gear Diagnostics");
    } else {
      setTitle("Comprehensive 250-Hour Preventive Maintenance Cycle");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHapticTap();
    setIsSubmitting(true);

    setTimeout(() => {
      const order: ServiceWorkOrder = {
        id: `WO-${Math.floor(1000 + Math.random() * 9000)}`,
        truckId: truck.id,
        truckNumber: truck.truckNumber,
        model: truck.model,
        title,
        category,
        urgency,
        serviceBay,
        technician: "Assigned: Lead Tech Dave Kowalski",
        scheduledTime,
        status: "scheduled",
        notes,
        estimatedHours: urgency === "critical" ? 4.5 : 2.0,
        partsAllocated: ["Diagnostic Scan Kit", "OEM Filter Cartridge #9812"],
      };

      setCreatedOrder(order);
      setIsSubmitting(false);
      setIsSuccess(true);
      onBookService(order);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-black/80 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-lime-500/20 border border-lime-500/30 flex items-center justify-center text-lime-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white tracking-tight">
                Book Mining Truck Service
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {truck.model} • Hauler #{truck.truckNumber}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHapticTap();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess && createdOrder ? (
          <div className="py-6 space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-lime-500/20 border border-lime-500/40 text-lime-400 flex items-center justify-center mx-auto shadow-lg shadow-lime-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-mono uppercase font-bold text-lime-400 tracking-wider">
                Work Order Confirmed
              </span>
              <h4 className="text-lg font-black text-white">{createdOrder.id}</h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Service slot confirmed for <strong>{truck.model} #{truck.truckNumber}</strong> at{" "}
                <strong>{createdOrder.serviceBay}</strong> ({createdOrder.scheduledTime}).
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-left text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Task:</span>
                <strong className="text-white">{createdOrder.title}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Assigned Bay:</span>
                <strong className="text-lime-300">{createdOrder.serviceBay}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Estimated Downtime:</span>
                <strong className="text-amber-400 font-mono">{createdOrder.estimatedHours} Hours</strong>
              </div>
            </div>

            <button
              onClick={() => {
                triggerHapticTap();
                setIsSuccess(false);
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-sm transition shadow-lg shadow-lime-500/20 cursor-pointer"
            >
              Return to Fleet Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* System Category Selector */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Service Component / Subsystem
              </label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => handleSelectCategory(c.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex flex-col gap-1 transition-all ${
                      category === c.id
                        ? "bg-lime-500/15 border-lime-500 text-lime-300 ring-1 ring-lime-500/30"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    <span className="text-base">{c.icon}</span>
                    <span className="truncate">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Urgency Level */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Urgency & Operational Impact
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "routine", label: "Routine PM", badge: "Non-Urgent", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
                  { id: "moderate", label: "Priority", badge: "Next Shift", color: "text-amber-300 border-amber-500/30 bg-amber-500/10" },
                  { id: "critical", label: "Critical", badge: "Stood Down", color: "text-rose-300 border-rose-500/30 bg-rose-500/10" },
                ].map((u) => (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => {
                      triggerHapticTap();
                      setUrgency(u.id as any);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-0.5 transition-all ${
                      urgency === u.id
                        ? `${u.color} ring-1 ring-white/20 font-black`
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <span>{u.label}</span>
                    <span className="text-[10px] font-mono opacity-80">{u.badge}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Notes */}
            <div className="space-y-2">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Service Work Order Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-lime-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Service Workshop Bay
                  </label>
                  <select
                    value={serviceBay}
                    onChange={(e) => setServiceBay(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-lime-500 focus:outline-none"
                  >
                    {bays.map((b) => (
                      <option key={b} value={b} className="bg-slate-900">
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Scheduled Window
                  </label>
                  <input
                    type="text"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-lime-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Defect Description & Driver Field Log
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-lime-500 focus:outline-none"
                  placeholder="Detail symptoms, pressure drops, unusual vibrations, or fault codes..."
                />
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-300 hover:to-lime-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-lime-500/20 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Generating Work Order & Dispatching Crew...</span>
              ) : (
                <>
                  <Wrench className="w-4 h-4" />
                  <span>Confirm Service Booking</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
