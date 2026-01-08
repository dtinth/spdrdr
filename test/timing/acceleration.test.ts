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

    it("returns position at quarter acceleration (250ms)", () => {
      // t = 250ms = 0.25 * accelerationDuration
      // s = 0.5 * (0.25)² * 1000 = 0.5 * 0.0625 * 1000 = 31.25ms
      const position = getPlaybackPosition(250);
      expect(position).toBe(31.25);
    });

    it("returns position at half acceleration (500ms)", () => {
      // t = 500ms = 0.5 * accelerationDuration
      // s = 0.5 * (0.5)² * 1000 = 0.5 * 0.25 * 1000 = 125ms
      const position = getPlaybackPosition(500);
      expect(position).toBe(125);
    });

    it("returns position at 75% acceleration (750ms)", () => {
      // t = 750ms = 0.75 * accelerationDuration
      // s = 0.5 * (0.75)² * 1000 = 0.5 * 0.5625 * 1000 = 281.25ms
      const position = getPlaybackPosition(750);
      expect(position).toBe(281.25);
    });

    it("returns 500ms at end of acceleration phase (1000ms)", () => {
      // t = 1000ms = 1 * accelerationDuration
      // s = 0.5 * (1)² * 1000 = 500ms
      const position = getPlaybackPosition(1000);
      expect(position).toBe(500);
    });
  });

  describe("getPlaybackPosition - linear phase", () => {
    it("continues linearly after acceleration (1500ms)", () => {
      // 500ms from accel + 500ms at 1x speed = 1000ms playback
      const position = getPlaybackPosition(1500);
      expect(position).toBe(1000);
    });

    it("continues linearly after acceleration (2000ms)", () => {
      // 500ms from accel + 1000ms at 1x speed = 1500ms playback
      const position = getPlaybackPosition(2000);
      expect(position).toBe(1500);
    });

    it("continues linearly after acceleration (5000ms)", () => {
      // 500ms from accel + 4000ms at 1x speed = 4500ms playback
      const position = getPlaybackPosition(5000);
      expect(position).toBe(4500);
    });

    it("handles large time values correctly", () => {
      // 500ms from accel + 9500ms at 1x speed = 10000ms playback
      const position = getPlaybackPosition(10000);
      expect(position).toBe(10000 - 500);
    });
  });

  describe("getPlaybackPosition - physics validation", () => {
    it("playback position increases monotonically", () => {
      const times = [0, 100, 250, 500, 750, 1000, 1500, 2000, 5000];
      const positions = times.map(t => getPlaybackPosition(t));

      for (let i = 1; i < positions.length; i++) {
        expect(positions[i]).toBeGreaterThanOrEqual(positions[i - 1]);
      }
    });

    it("acceleration phase grows non-linearly (accelerating)", () => {
      // Distance in first 250ms
      const dist1 = getPlaybackPosition(250);
      // Distance in second 250ms (250-500ms)
      const dist2 = getPlaybackPosition(500) - getPlaybackPosition(250);
      // Distance in third 250ms (500-750ms)
      const dist3 = getPlaybackPosition(750) - getPlaybackPosition(500);
      // Distance in fourth 250ms (750-1000ms)
      const dist4 = getPlaybackPosition(1000) - getPlaybackPosition(750);

      // Each interval should be larger than the previous (due to acceleration)
      expect(dist2).toBeGreaterThan(dist1);
      expect(dist3).toBeGreaterThan(dist2);
      expect(dist4).toBeGreaterThan(dist3);
    });

    it("linear phase moves at constant velocity (1x speed)", () => {
      // After acceleration, every 100ms of wall time = 100ms playback
      const pos1000 = getPlaybackPosition(1000);
      const pos1100 = getPlaybackPosition(1100);
      const pos1200 = getPlaybackPosition(1200);

      const diff1 = pos1100 - pos1000;
      const diff2 = pos1200 - pos1100;

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
    it("returns 1000ms for default config", () => {
      const endTime = getAccelerationEndTime();
      expect(endTime).toBe(1000);
    });

    it("returns configured duration", () => {
      const endTime = getAccelerationEndTime({ accelerationDuration: 2000 });
      expect(endTime).toBe(2000);
    });
  });

  describe("getAccelerationEndPosition", () => {
    it("returns 500ms for default config", () => {
      const endPos = getAccelerationEndPosition();
      expect(endPos).toBe(500);
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
      // Verify the physics formula: with a=1, duration=1000
      // At t, position should be 0.5 * (t/1000)² * 1000

      const testCases = [
        { time: 0, expected: 0 },
        { time: 100, expected: 5 }, // 0.5 * 0.01 * 1000
        { time: 200, expected: 20 }, // 0.5 * 0.04 * 1000
        { time: 500, expected: 125 }, // 0.5 * 0.25 * 1000
        { time: 1000, expected: 500 }, // 0.5 * 1.0 * 1000
      ];

      testCases.forEach(({ time, expected }) => {
        const actual = getPlaybackPosition(time);
        expect(actual).toBeCloseTo(expected, 5);
      });
    });

    it("linear phase: s = base + v * t", () => {
      // After 1000ms wall time = 500ms playback
      // For each additional ms of wall time, add 1ms of playback
      const basePos = getPlaybackPosition(1000); // 500ms
      expect(basePos).toBe(500);

      // At 1100ms wall time
      const pos1100 = getPlaybackPosition(1100); // 500 + 100 = 600ms
      expect(pos1100).toBe(600);

      // At 2000ms wall time
      const pos2000 = getPlaybackPosition(2000); // 500 + 1000 = 1500ms
      expect(pos2000).toBe(1500);
    });
  });
});
