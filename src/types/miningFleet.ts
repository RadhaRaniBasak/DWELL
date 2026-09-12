export interface MiningTruck {
  id: string;
  truckNumber: string;
  model: string;
  manufacturer: "Caterpillar" | "Komatsu" | "BelAZ" | "Liebherr";
  className: string;
  status: "operational" | "loading" | "in_dwell" | "maintenance" | "transit";
  statusLabel: string;
  locationName: string;
  operatorName: string;
  operatorCert: string;
  payloadTonnes: number;
  maxPayloadTonnes: number;
  fuelPercent: number;
  fuelGallons: number;
  tirePressurePsi: number;
  tireStatus: "optimal" | "warning" | "critical";
  engineTempF: number;
  engineHealthPercent: number;
  hoursOperating: number;
  batteryVoltage: number;
  currentStopId: string;
  activeLoadId: string;
  speedMph: number;
  geofenceZone: string;
}

export interface ServiceWorkOrder {
  id: string;
  truckId: string;
  truckNumber: string;
  model: string;
  title: string;
  category: "hydraulic" | "tires" | "brakes" | "engine" | "transmission" | "pm_inspection";
  urgency: "routine" | "moderate" | "critical";
  serviceBay: string;
  technician: string;
  scheduledTime: string;
  status: "scheduled" | "in_progress" | "completed";
  notes: string;
  estimatedHours: number;
  partsAllocated: string[];
}

export interface PitGeofenceZone {
  id: string;
  name: string;
  type: "loading_pit" | "crusher" | "dump" | "maintenance_workshop" | "fuel_depot";
  activeTruckCount: number;
  averageDwellMinutes: number;
  status: "normal" | "congested" | "clear";
  lat: number;
  lng: number;
  radiusMeters: number;
}
