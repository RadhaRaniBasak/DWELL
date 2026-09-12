import { DwellEvent, Stop } from "../../types/dwell";

export const GEOFENCE_RADIUS_METERS = 250;
export const FIXES_REQUIRED_TO_CONFIRM_ARRIVAL = 3;
export const MINUTES_INSIDE_TO_CONFIRM_ARRIVAL = 5;
export const MINUTES_OUTSIDE_TO_CONFIRM_DEPARTURE = 10;
export const MAX_ACCURACY_THRESHOLD_METERS = 100;

export interface RawGpsFix {
  lat: number;
  lng: number;
  accuracyMeters: number;
  timestamp: string; // ISO string
}

export interface GeofenceState {
  qualifyingInsideFixes: RawGpsFix[];
  qualifyingOutsideFixes: RawGpsFix[];
  isArrivalConfirmed: boolean;
  isDepartureConfirmed: boolean;
  firstInsideFixTime: string | null;
  confirmedArrivalTime: string | null;
  confirmedDepartureTime: string | null;
}

/**
 * Haversine formula to compute distance in meters between two lat/lng coordinates
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Process a GPS fix against a target facility location with debouncing.
 * Prevents flapping when a truck idles near the fence line.
 */
export function processGpsFix(
  stop: Stop,
  fix: RawGpsFix,
  currentState: GeofenceState
): {
  updatedState: GeofenceState;
  eventsToEmit: Array<{
    type: DwellEvent["type"];
    occurredAt: string;
    recordedAt: string;
    lat: number;
    lng: number;
    accuracyMeters: number;
    payload?: Record<string, unknown>;
  }>;
  shouldMarkArrived: boolean;
  arrivalTimestamp: string | null;
  shouldMarkDeparted: boolean;
  departureTimestamp: string | null;
} {
  const recordedAt = new Date().toISOString();
  const eventsToEmit: any[] = [];
  let shouldMarkArrived = false;
  let arrivalTimestamp: string | null = null;
  let shouldMarkDeparted = false;
  let departureTimestamp: string | null = null;

  // 1. Discard inaccurate fixes (e.g. cell tower bounce)
  if (fix.accuracyMeters > MAX_ACCURACY_THRESHOLD_METERS) {
    eventsToEmit.push({
      type: "raw_gps_fix",
      occurredAt: fix.timestamp,
      recordedAt,
      lat: fix.lat,
      lng: fix.lng,
      accuracyMeters: fix.accuracyMeters,
      payload: { discarded: true, reason: `Accuracy ${fix.accuracyMeters}m exceeds 100m threshold` },
    });
    return {
      updatedState: currentState,
      eventsToEmit,
      shouldMarkArrived,
      arrivalTimestamp,
      shouldMarkDeparted,
      departureTimestamp,
    };
  }

  // 2. Measure distance to facility
  const distance = calculateDistanceMeters(fix.lat, fix.lng, stop.lat, stop.lng);
  const isInside = distance <= GEOFENCE_RADIUS_METERS;

  // Log raw valid fix
  eventsToEmit.push({
    type: "raw_gps_fix",
    occurredAt: fix.timestamp,
    recordedAt,
    lat: fix.lat,
    lng: fix.lng,
    accuracyMeters: fix.accuracyMeters,
    payload: { distanceMeters: Math.round(distance), isInside },
  });

  const nextState: GeofenceState = {
    ...currentState,
    qualifyingInsideFixes: [...currentState.qualifyingInsideFixes],
    qualifyingOutsideFixes: [...currentState.qualifyingOutsideFixes],
  };

  // ARRIVAL DETECTION LOGIC
  if (!currentState.isArrivalConfirmed && !stop.arrivedAt) {
    if (isInside) {
      nextState.qualifyingInsideFixes.push(fix);
      if (!nextState.firstInsideFixTime) {
        nextState.firstInsideFixTime = fix.timestamp;
        eventsToEmit.push({
          type: "geofence_arrival_detected",
          occurredAt: fix.timestamp,
          recordedAt,
          lat: fix.lat,
          lng: fix.lng,
          accuracyMeters: fix.accuracyMeters,
          payload: { note: "First entry into 250m geofence" },
        });
      }

      // Check debouncing thresholds
      const firstFixTime = new Date(nextState.firstInsideFixTime).getTime();
      const currentFixTime = new Date(fix.timestamp).getTime();
      const minutesInside = (currentFixTime - firstFixTime) / (60 * 1000);

      if (
        nextState.qualifyingInsideFixes.length >= FIXES_REQUIRED_TO_CONFIRM_ARRIVAL ||
        minutesInside >= MINUTES_INSIDE_TO_CONFIRM_ARRIVAL
      ) {
        // Backdate occurredAt to the FIRST qualifying fix!
        const backdatedArrival = nextState.firstInsideFixTime;
        nextState.isArrivalConfirmed = true;
        nextState.confirmedArrivalTime = backdatedArrival;
        shouldMarkArrived = true;
        arrivalTimestamp = backdatedArrival;

        eventsToEmit.push({
          type: "confirmed_arrival",
          occurredAt: backdatedArrival,
          recordedAt,
          lat: fix.lat,
          lng: fix.lng,
          accuracyMeters: fix.accuracyMeters,
          payload: {
            method: "geofence_debounced",
            qualifyingFixesCount: nextState.qualifyingInsideFixes.length,
            backdatedToFirstFix: true,
          },
        });
      }
    } else {
      // Truck stepped outside before confirming arrival
      if (nextState.qualifyingInsideFixes.length > 0) {
        nextState.qualifyingInsideFixes = [];
        nextState.firstInsideFixTime = null;
      }
    }
  }

  // DEPARTURE DETECTION LOGIC (only if arrived and not yet departed)
  if ((currentState.isArrivalConfirmed || stop.arrivedAt) && !stop.departedAt && !currentState.isDepartureConfirmed) {
    if (!isInside) {
      nextState.qualifyingOutsideFixes.push(fix);
      const firstOutsideTime = new Date(nextState.qualifyingOutsideFixes[0].timestamp).getTime();
      const currentFixTime = new Date(fix.timestamp).getTime();
      const minutesOutside = (currentFixTime - firstOutsideTime) / (60 * 1000);

      if (minutesOutside >= MINUTES_OUTSIDE_TO_CONFIRM_DEPARTURE) {
        const departureTime = nextState.qualifyingOutsideFixes[0].timestamp;
        nextState.isDepartureConfirmed = true;
        nextState.confirmedDepartureTime = departureTime;
        shouldMarkDeparted = true;
        departureTimestamp = departureTime;

        eventsToEmit.push({
          type: "confirmed_departure",
          occurredAt: departureTime,
          recordedAt,
          lat: fix.lat,
          lng: fix.lng,
          accuracyMeters: fix.accuracyMeters,
          payload: {
            method: "geofence_departure_confirmed",
            minutesOutside,
          },
        });
      }
    } else {
      // Reset outside fixes if truck is back inside
      nextState.qualifyingOutsideFixes = [];
    }
  }

  return {
    updatedState: nextState,
    eventsToEmit,
    shouldMarkArrived,
    arrivalTimestamp,
    shouldMarkDeparted,
    departureTimestamp,
  };
}
