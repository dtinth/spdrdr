import { describe, expect, it } from "bun:test";
import {
  getPlaybackPosition,
  getAccelerationEndTime,
  getAccelerationEndPosition,
  DEFAULT_ACCELERATION_CONFIG,
} from "../../src/timing/acceleration";

describe("Acceleration Curve", () => {
  describe("getPlaybackPosition - acceleration phase", () => {
    it("returns 0 at time 0", () => {
      const position = getPlaybackPosition(0);
      expect(position).toBe(0);
    });

    it("returns 0 for negative time", () => {
      const position = getPlaybackPosition(-100);
      expect(position).toBe(0);
    });

    it("returns position at quarter acceleration (500ms)", () => {
      // t = 500ms = 0.25 * accelerationDuration (2000ms)
      // s = 0.5 * (0.25)² * 2000 = 0.5 * 0.0625 * 2000 = 62.5ms
      const position = getPlaybackPosition(500);
      expect(position).toBe(62.5);
    });

    it("returns position at half acceleration (1000ms)", () => {
      // t = 1000ms = 0.5 * accelerationDuration (2000ms)
      // s = 0.5 * (0.5)² * 2000 = 0.5 * 0.25 * 2000 = 250ms
      const position = getPlaybackPosition(1000);
      expect(position).toBe(250);
    });

    it("returns position at 75% acceleration (1500ms)", () => {
      // t = 1500ms = 0.75 * accelerationDuration (2000ms)
      // s = 0.5 * (0.75)² * 2000 = 0.5 * 0.5625 * 2000 = 562.5ms
      const position = getPlaybackPosition(1500);
      expect(position).toBe(562.5);
    });

    it("returns 1000ms at end of acceleration phase (2000ms)", () => {
      // t = 2000ms = 1 * accelerationDuration
      // s = 0.5 * (1)² * 2000 = 1000ms
      const position = getPlaybackPosition(2000);
      expect(position).toBe(1000);
    });
  });

  describe("getPlaybackPosition - linear phase", () => {
    it("continues linearly after acceleration (3000ms)", () => {
      // 1000ms from accel + 1000ms at 1x speed = 2000ms playback
      const position = getPlaybackPosition(3000);
      expect(position).toBe(2000);
    });

    it("continues linearly after acceleration (4000ms)", () => {
      // 1000ms from accel + 2000ms at 1x speed = 3000ms playback
      const position = getPlaybackPosition(4000);
      expect(position).toBe(3000);
    });

    it("continues linearly after acceleration (6000ms)", () => {
      // 1000ms from accel + 4000ms at 1x speed = 5000ms playback
      const position = getPlaybackPosition(6000);
      expect(position).toBe(5000);
    });

    it("handles large time values correctly", () => {
      // 1000ms from accel + 8000ms at 1x speed = 9000ms playback
      const position = getPlaybackPosition(10000);
      expect(position).toBe(10000 - 1000);
    });
  });

  describe("getPlaybackPosition - physics validation", () => {
    it("playback position increases monotonically", () => {
      const times = [0, 200, 400, 800, 1000, 1500, 2000, 3000, 4000];
      const positions = times.map(t => getPlaybackPosition(t));

      for (let i = 1; i < positions.length; i++) {
        expect(positions[i]!).toBeGreaterThanOrEqual(positions[i - 1]!);
      }
    });

    it("acceleration phase grows non-linearly (accelerating)", () => {
      // Distance in first 500ms
      const dist1 = getPlaybackPosition(500);
      // Distance in second 500ms (500-1000ms)
      const dist2 = getPlaybackPosition(1000) - getPlaybackPosition(500);
      // Distance in third 500ms (1000-1500ms)
      const dist3 = getPlaybackPosition(1500) - getPlaybackPosition(1000);
      // Distance in fourth 500ms (1500-2000ms)
      const dist4 = getPlaybackPosition(2000) - getPlaybackPosition(1500);

      // Each interval should be larger than the previous (due to acceleration)
      expect(dist2).toBeGreaterThan(dist1);
      expect(dist3).toBeGreaterThan(dist2);
      expect(dist4).toBeGreaterThan(dist3);
    });

    it("linear phase moves at constant velocity (1x speed)", () => {
      // After acceleration (2000ms), every 100ms of wall time = 100ms playback
      const pos2100 = getPlaybackPosition(2100);
      const pos2200 = getPlaybackPosition(2200);
      const pos2300 = getPlaybackPosition(2300);

      const diff1 = pos2200 - pos2100;
      const diff2 = pos2300 - pos2200;

      expect(diff1).toBe(100);
      expect(diff2).toBe(100);
    });
  });

  describe("getPlaybackPosition - custom config", () => {
    it("respects custom acceleration duration", () => {
      const config = { accelerationDuration: 2000 };

      // At half the acceleration duration
      const pos = getPlaybackPosition(1000, config);
      // s = 0.5 * (1000/2000)² * 2000 = 0.5 * 0.25 * 2000 = 250ms
      expect(pos).toBe(250);
    });

    it("respects custom acceleration duration at end", () => {
      const config = { accelerationDuration: 2000 };

      // At end of acceleration
      const pos = getPlaybackPosition(2000, config);
      // s = 0.5 * (2000/2000)² * 2000 = 0.5 * 1 * 2000 = 1000ms
      expect(pos).toBe(1000);
    });

    it("respects custom acceleration duration in linear phase", () => {
      const config = { accelerationDuration: 2000 };

      // After acceleration: 1000ms from accel + 1000ms at 1x
      const pos = getPlaybackPosition(3000, config);
      expect(pos).toBe(2000);
    });
  });

  describe("getAccelerationEndTime", () => {
    it("returns 2000ms for default config", () => {
      const endTime = getAccelerationEndTime();
      expect(endTime).toBe(2000);
    });

    it("returns configured duration", () => {
      const endTime = getAccelerationEndTime({ accelerationDuration: 2000 });
      expect(endTime).toBe(2000);
    });
  });

  describe("getAccelerationEndPosition", () => {
    it("returns 1000ms for default config", () => {
      const endPos = getAccelerationEndPosition();
      expect(endPos).toBe(1000);
    });

    it("returns 0.5 * duration for custom config", () => {
      const endPos = getAccelerationEndPosition({ accelerationDuration: 2000 });
      expect(endPos).toBe(1000);
    });

    it("matches calculated playback position at acceleration end", () => {
      const config = DEFAULT_ACCELERATION_CONFIG;
      const endTime = getAccelerationEndTime(config);
      const endPos = getAccelerationEndPosition(config);
      const calculatedPos = getPlaybackPosition(endTime, config);

      expect(calculatedPos).toBe(endPos);
    });
  });

  describe("physics verification", () => {
    it("acceleration phase: s = 0.5 * a * t²", () => {
      // Verify the physics formula: with a=1, duration=2000
      // At t, position should be 0.5 * (t/2000)² * 2000

      const testCases = [
        { time: 0, expected: 0 },
        { time: 200, expected: 10 }, // 0.5 * 0.01 * 2000
        { time: 400, expected: 40 }, // 0.5 * 0.04 * 2000
        { time: 1000, expected: 250 }, // 0.5 * 0.25 * 2000
        { time: 2000, expected: 1000 }, // 0.5 * 1.0 * 2000
      ];

      testCases.forEach(({ time, expected }) => {
        const actual = getPlaybackPosition(time);
        expect(actual).toBeCloseTo(expected, 5);
      });
    });

    it("linear phase: s = base + v * t", () => {
      // After 2000ms wall time = 1000ms playback
      // For each additional ms of wall time, add 1ms of playback
      const basePos = getPlaybackPosition(2000); // 1000ms
      expect(basePos).toBe(1000);

      // At 2100ms wall time
      const pos2100 = getPlaybackPosition(2100); // 1000 + 100 = 1100ms
      expect(pos2100).toBe(1100);

      // At 3000ms wall time
      const pos3000 = getPlaybackPosition(3000); // 1000 + 1000 = 2000ms
      expect(pos3000).toBe(2000);
    });
  });
});
