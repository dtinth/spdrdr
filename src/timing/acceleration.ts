/**
 * Acceleration Curve: Maps wall-clock time to playback position
 *
 * Physics: u=0 (start at rest), v=1 (reach 1x speed), a=1 (acceleration)
 * Acceleration phase duration: t = v/a = 1/1 = 1 second (1000ms)
 * Distance during acceleration: s = u*t + 0.5*a*t² = 0.5*1² = 0.5s (500ms playback)
 *
 * After 1000ms of real time, we transition to linear motion at 1x speed
 */

export interface AccelerationConfig {
  /** Duration of acceleration phase in milliseconds (default: 1000ms) */
  accelerationDuration: number;
}

/** Default: 1 second acceleration from 0 to 1x speed */
export const DEFAULT_ACCELERATION_CONFIG: AccelerationConfig = {
  accelerationDuration: 1000,
};

/**
 * Calculate playback position based on wall-clock elapsed time
 *
 * @param wallClockTime - Elapsed time since play started (milliseconds)
 * @param config - Acceleration configuration
 * @returns Playback position in milliseconds
 *
 * @example
 * // After 1 second of real time
 * getPlaybackPosition(1000) // Returns 500ms (halfway through content)
 *
 * // After 2 seconds of real time (1s accel + 1s linear)
 * getPlaybackPosition(2000) // Returns 1500ms (500 + 1000)
 */
export function getPlaybackPosition(
  wallClockTime: number,
  config: AccelerationConfig = DEFAULT_ACCELERATION_CONFIG
): number {
  const { accelerationDuration } = config;

  if (wallClockTime <= 0) {
    return 0;
  }

  // During acceleration phase: s = 0.5 * (t / accelDuration)²
  if (wallClockTime <= accelerationDuration) {
    const normalizedTime = wallClockTime / accelerationDuration;
    // Distance covered during acceleration phase (at end: 500ms)
    const accelDistance = 0.5 * accelerationDuration * (normalizedTime * normalizedTime);
    return accelDistance;
  }

  // After acceleration phase: linear motion at 1x speed
  // accelDistance + remaining time at 1x speed
  const accelDistance = 0.5 * accelerationDuration;
  const linearTime = wallClockTime - accelerationDuration;
  return accelDistance + linearTime;
}

/**
 * Calculate the wall-clock time at which acceleration completes
 *
 * @param config - Acceleration configuration
 * @returns Time in milliseconds
 */
export function getAccelerationEndTime(
  config: AccelerationConfig = DEFAULT_ACCELERATION_CONFIG
): number {
  return config.accelerationDuration;
}

/**
 * Calculate the playback position at which acceleration completes
 * This is where we transition from accelerated to linear motion
 *
 * @param config - Acceleration configuration
 * @returns Playback position in milliseconds
 */
export function getAccelerationEndPosition(
  config: AccelerationConfig = DEFAULT_ACCELERATION_CONFIG
): number {
  return 0.5 * config.accelerationDuration;
}
