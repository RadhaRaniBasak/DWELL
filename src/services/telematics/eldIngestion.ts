import { EldEventType, EldLogEntry, EldProvider, EldWebhookPayload, Stop } from "../../types/dwell";

/**
 * Normalizes vendor-specific ELD webhook payloads into a unified format.
 */
export function normalizeEldWebhook(
  provider: EldProvider,
  rawBody: any
): EldWebhookPayload {
  const now = new Date().toISOString();

  if (provider === "samsara") {
    // Samsara webhook structure
    // e.g. { eventType: "GeofenceEntry", vehicle: { id: "2814749" }, location: { latitude: 36.3621, longitude: -94.2052 }, time: "..." }
    const eventType: EldEventType =
      rawBody.eventType === "GeofenceEntry" || rawBody.event === "geofence_entry"
        ? "geofence_entry"
        : rawBody.eventType === "GeofenceExit" || rawBody.event === "geofence_exit"
        ? "geofence_exit"
        : rawBody.eventType === "HosDutyChange"
        ? "hos_duty_change"
        : "location_ping";

    return {
      provider: "samsara",
      eventType,
      vehicleId: String(rawBody.vehicle?.id || rawBody.vehicleId || "TRK-4012"),
      driverId: String(rawBody.driver?.id || rawBody.driverId || "DRV-881"),
      stopId: rawBody.stopId,
      loadId: rawBody.loadId,
      timestamp: rawBody.time || rawBody.timestamp || now,
      lat: Number(rawBody.location?.latitude ?? rawBody.lat ?? 36.3621),
      lng: Number(rawBody.location?.longitude ?? rawBody.lng ?? -94.2052),
      speedMph: Number(rawBody.location?.speedMph ?? rawBody.speedMph ?? 0),
      odometerMiles: Number(rawBody.vehicle?.odometerMiles ?? rawBody.odometerMiles ?? 142850),
      ignitionOn: Boolean(rawBody.vehicle?.ignitionOn ?? rawBody.ignitionOn ?? true),
      geofenceId: rawBody.geofence?.id || "geo-samsara-99",
      geofenceName: rawBody.geofence?.name || "Facility Terminal 250m",
      dutyStatus: rawBody.dutyStatus || "OnDuty_NotDriving",
    };
  }

  if (provider === "motive") {
    // Motive (formerly KeepTruckin) structure
    // e.g. { event_type: "geofence_entry", vehicle_id: "veh_102", location: { lat: 36.3621, lon: -94.2052 } }
    const eventType: EldEventType =
      rawBody.event_type === "geofence_entry" || rawBody.event === "geofence_entry"
        ? "geofence_entry"
        : rawBody.event_type === "geofence_exit" || rawBody.event === "geofence_exit"
        ? "geofence_exit"
        : rawBody.event_type === "hos_status_changed"
        ? "hos_duty_change"
        : "location_ping";

    return {
      provider: "motive",
      eventType,
      vehicleId: String(rawBody.vehicle_id || rawBody.vehicleId || "TRK-MOTIVE-89"),
      driverId: String(rawBody.driver_id || "DRV-MOTIVE-12"),
      stopId: rawBody.stopId,
      loadId: rawBody.loadId,
      timestamp: rawBody.occurred_at || rawBody.timestamp || now,
      lat: Number(rawBody.location?.lat ?? rawBody.lat ?? 36.3621),
      lng: Number(rawBody.location?.lon ?? rawBody.lng ?? -94.2052),
      speedMph: Number(rawBody.speed_mph ?? 0),
      odometerMiles: Number(rawBody.odometer ?? 218900),
      ignitionOn: Boolean(rawBody.ignition_state === "on" || rawBody.ignitionOn),
      geofenceId: rawBody.geofence_id || "motive-geo-41",
      geofenceName: rawBody.geofence_name || "Customer Dock Gate",
      dutyStatus: rawBody.duty_status || "OnDuty_NotDriving",
    };
  }

  // Geotab structure
  // e.g. { type: "ExceptionEvent", device: { id: "b1" }, zone: { name: "Dock" }, latitude: 36.3621, longitude: -94.2052 }
  const eventType: EldEventType =
    rawBody.type === "ZoneEntry" || rawBody.rule === "Zone_Inside" || rawBody.eventType === "geofence_entry"
      ? "geofence_entry"
      : rawBody.type === "ZoneExit" || rawBody.rule === "Zone_Outside" || rawBody.eventType === "geofence_exit"
      ? "geofence_exit"
      : rawBody.type === "LogRecord"
      ? "location_ping"
      : "geofence_entry";

  return {
    provider: "geotab",
    eventType,
    vehicleId: String(rawBody.device?.id || rawBody.vehicleId || "GEO-GO9-551"),
    driverId: String(rawBody.driver?.id || "DRV-GEO-44"),
    stopId: rawBody.stopId,
    loadId: rawBody.loadId,
    timestamp: rawBody.dateTime || rawBody.timestamp || now,
    lat: Number(rawBody.latitude ?? rawBody.lat ?? 36.3621),
    lng: Number(rawBody.longitude ?? rawBody.lng ?? -94.2052),
    speedMph: Number(rawBody.speed ?? 0),
    odometerMiles: Number(rawBody.odometer ?? 184500),
    ignitionOn: true,
    geofenceId: rawBody.zone?.id || "geotab-zone-12",
    geofenceName: rawBody.zone?.name || "Shipper/Receiver Compound",
    dutyStatus: "OnDuty_NotDriving",
  };
}

/**
 * Creates a realistic simulated webhook payload for testing.
 */
export function generateSimulatedEldPayload(
  provider: EldProvider,
  action: "arrival" | "departure" | "ping",
  stop: Stop
): any {
  const now = new Date().toISOString();
  const lat = action === "departure" ? stop.lat + 0.008 : stop.lat;
  const lng = action === "departure" ? stop.lng + 0.008 : stop.lng;

  if (provider === "samsara") {
    return {
      eventType: action === "arrival" ? "GeofenceEntry" : action === "departure" ? "GeofenceExit" : "LocationPing",
      time: now,
      vehicle: {
        id: "281474976710655",
        name: "Freightliner Cascadia #4012",
        odometerMiles: 148291,
        ignitionOn: action !== "departure",
      },
      location: {
        latitude: lat,
        longitude: lng,
        speedMph: action === "departure" ? 18.4 : 0,
        headingDegrees: 180,
      },
      geofence: {
        id: "geo_wm_6094",
        name: stop.facilityName || "Walmart DC #6094",
      },
      stopId: stop.id,
      loadId: stop.loadId,
      dutyStatus: "OnDuty_NotDriving",
    };
  }

  if (provider === "motive") {
    return {
      event_type: action === "arrival" ? "geofence_entry" : action === "departure" ? "geofence_exit" : "location_ping",
      occurred_at: now,
      vehicle_id: "motive_cascadia_9921",
      driver_id: "motive_drv_jmartinez",
      location: {
        lat,
        lon: lng,
      },
      speed_mph: action === "departure" ? 14.5 : 0,
      ignition_state: action === "departure" ? "on" : "off",
      geofence_id: "geo_motive_881",
      geofence_name: stop.facilityName,
      stopId: stop.id,
      loadId: stop.loadId,
    };
  }

  // Geotab
  return {
    type: action === "arrival" ? "ZoneEntry" : action === "departure" ? "ZoneExit" : "LogRecord",
    dateTime: now,
    device: {
      id: "GO9_SERIAL_991823",
      name: "Kenworth T680 #108",
    },
    latitude: lat,
    longitude: lng,
    speed: action === "departure" ? 22 : 0,
    zone: {
      id: "Zone_DC_6094",
      name: stop.facilityName,
    },
    stopId: stop.id,
    loadId: stop.loadId,
  };
}
