import { HosCalculation, Stop } from "../../types/dwell";

export function calculateHosImpact(params: {
  stop: Stop;
  shiftStartedAt?: string; // default to 8 hours before now if not specified
  estimatedDriveToSafeHavenMinutes?: number;
  safeParkingHavenName?: string;
}): HosCalculation {
  const {
    stop,
    shiftStartedAt,
    estimatedDriveToSafeHavenMinutes = 35,
    safeParkingHavenName = "TA Travel Center #182 (I-80 Exit 42, 18 miles)",
  } = params;

  const now = new Date();
  const arrivalTime = stop.arrivedAt ? new Date(stop.arrivedAt) : now;

  // Assume standard commercial driver 14-hour on-duty shift
  const shiftStart = shiftStartedAt
    ? new Date(shiftStartedAt)
    : new Date(arrivalTime.getTime() - 6.5 * 60 * 60 * 1000); // 6.5 hours prior to arrival

  const shiftDurationMs = Math.max(0, now.getTime() - shiftStart.getTime());
  const onDutyMinutesUsed = Math.round(shiftDurationMs / (60 * 1000));

  // 14-hour shift window = 840 minutes
  const total14HrLimitMinutes = 14 * 60;
  const shift14HrExpiresAtDate = new Date(shiftStart.getTime() + total14HrLimitMinutes * 60 * 1000);
  const minutesUntil14HrExpired = Math.round(
    (shift14HrExpiresAtDate.getTime() - now.getTime()) / (60 * 1000)
  );

  // Calculate current dock dwell
  const currentDwellMinutes = stop.arrivedAt
    ? Math.max(0, Math.round((now.getTime() - new Date(stop.arrivedAt).getTime()) / (60 * 1000)))
    : 0;

  // Max driving hours allowed is 11 hours (660 min)
  // Drive minutes remaining is capped by 14-hour window minus safe haven drive
  const driveMinutesRemaining = Math.max(0, Math.min(330, minutesUntil14HrExpired));

  const is14HourViolationImminent = minutesUntil14HrExpired <= 75; // 75 min or less

  // If remaining time on 14-hr clock is less than safe haven drive time + 15 min cushion, Layover is mandated
  const isLayoverMandated = minutesUntil14HrExpired <= (estimatedDriveToSafeHavenMinutes + 15);

  let complianceWarning = "HOS 14-Hour Window Normal. Sufficient drive-time remains to reach destination or safe haven.";
  if (isLayoverMandated) {
    complianceWarning = `CRITICAL HOS ALERT: Driver has only ${Math.max(0, minutesUntil14HrExpired)}m remaining on 14-hr duty clock. Driver CANNOT legally reach safe haven (${estimatedDriveToSafeHavenMinutes}m away) without violating FMCSA 49 CFR § 395.3. Mandatory 10-Hour Sleeper Reset required at dock. Layover accessorial ($450.00) triggered.`;
  } else if (is14HourViolationImminent) {
    complianceWarning = `WARNING: 14-hour duty window expires in ${minutesUntil14HrExpired}m. Immediate release from dock required within ${Math.max(0, minutesUntil14HrExpired - estimatedDriveToSafeHavenMinutes)}m to reach safe parking legally.`;
  }

  return {
    shiftStartedAt: shiftStart.toISOString(),
    currentDwellMinutes,
    freeTimeMinutes: 120,
    onDutyMinutesUsed,
    driveMinutesRemaining,
    shift14HrExpiresAt: shift14HrExpiresAtDate.toISOString(),
    minutesUntil14HrExpired,
    is14HourViolationImminent,
    estimatedDriveToSafeHavenMinutes,
    safeParkingHavenName,
    isLayoverMandated,
    layoverChargeCents: 45000, // $450.00
    tonuChargeCents: 30000,    // $300.00
    complianceWarning,
  };
}
