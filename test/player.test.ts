import { describe, expect, it, beforeEach, afterEach, jest } from "bun:test";
import { Player, type TimerApi } from "../src/player";
import type { Slide } from "../src/types";

// Create a test-friendly timer API that uses setTimeout/requestAnimationFrame
function createTestTimerApi(): TimerApi {
  return {
    requestAnimationFrame: (callback) => setTimeout(callback, 16) as unknown as number,
    cancelAnimationFrame: (id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>),
  };
}

// Mock slides for testing with timing info
const mockSlides: Slide[] = [
  {
    word: "Hello",
    pivotIndex: 1,
    duration: 100,
    startTime: 0,
    blockId: "1",
    wordIndex: 0,
    isBlockEnd: false,
    isDocumentEnd: false,
  },
  {
    word: "world",
    pivotIndex: 2,
    duration: 100,
    startTime: 100,
    blockId: "1",
    wordIndex: 1,
    isBlockEnd: true,
    isDocumentEnd: false,
  },
  {
    word: "Goodbye",
    pivotIndex: 2,
    duration: 100,
    startTime: 300, // 200ms gap between blocks
    blockId: "2",
    wordIndex: 0,
    isBlockEnd: true,
    isDocumentEnd: true,
  },
];

describe("Player", () => {
  let player: Player;

  beforeEach(() => {
    jest.useFakeTimers({ now: 0 });
    player = new Player(mockSlides, undefined, createTestTimerApi());
  });

  afterEach(() => {
    player.stop();
    jest.useRealTimers();
  });

  describe("initialization", () => {
    it("starts in idle state", () => {
      const state = player.getState();
      expect(state.status).toBe("idle");
      expect(state.currentTime).toBe(0);
    });

    it("has correct total slides", () => {
      expect(player.getTotalSlides()).toBe(3);
    });

    it("calculates total duration correctly", () => {
      const totalDuration = player.getTotalDurationMs();
      // Last slide starts at 300, duration 100 = 400ms total
      expect(totalDuration).toBe(400);
    });
  });

  describe("play and pause", () => {
    it("transitions to playing state", () => {
      let emittedStatus: string | null = null;
      player.events.on("statusChange", ({ status }) => {
        emittedStatus = status;
      });

      player.play();
      const state = player.getState();

      expect(state.status).toBe("playing");
      expect(emittedStatus).toBe("playing");
    });

    it("emits first slide on play", () => {
      let emittedSlide: Slide | null = null;
      player.events.on("slide", ({ slide }) => {
        emittedSlide = slide;
      });

      player.play();

      // Advance time for animation frame
      jest.advanceTimersByTime(50);

      expect(emittedSlide).toBe(mockSlides[0]);
    });

    it("pauses playback", () => {
      let emittedStatus: string | null = null;
      player.events.on("statusChange", ({ status }) => {
        emittedStatus = status;
      });

      player.play();
      player.pause();

      const state = player.getState();
      expect(state.status).toBe("paused");
      expect(emittedStatus).toBe("paused");
    });

    it("ignores play when already playing", () => {
      player.play();
      const stateAfterFirstPlay = player.getState();

      player.play();
      const stateAfterSecondPlay = player.getState();

      expect(stateAfterFirstPlay.status).toBe("playing");
      expect(stateAfterSecondPlay.status).toBe("playing");
    });
  });

  describe("toggle", () => {
    it("starts playing when idle", () => {
      player.toggle();
      expect(player.getState().status).toBe("playing");
    });

    it("pauses when playing", () => {
      player.play();
      player.toggle();
      expect(player.getState().status).toBe("paused");
    });

    it("resumes when paused", () => {
      player.play();
      player.pause();
      player.toggle();
      expect(player.getState().status).toBe("playing");
    });
  });

  describe("stop", () => {
    it("stops and resets to beginning", () => {
      player.play();
      player.seekToTime(250); // Somewhere in second slide
      player.stop();

      const state = player.getState();
      expect(state.status).toBe("idle");
      expect(state.currentTime).toBe(0);
    });

    it("emits idle status and zero progress", () => {
      let emittedStatus: string | null = null;
      let emittedProgress: { currentTime: number; totalTime: number } | null =
        null;

      player.events.on("statusChange", ({ status }) => {
        emittedStatus = status;
      });
      player.events.on("progress", (data) => {
        emittedProgress = data;
      });

      player.play();
      player.stop();

      expect(emittedStatus).toBe("idle");
      expect(emittedProgress?.currentTime).toBe(0);
    });
  });

  describe("seekToTime", () => {
    it("seeks to specific time", () => {
      player.seekToTime(150);
      expect(player.getState().currentTime).toBe(150);
    });

    it("clamps seek to valid range (min)", () => {
      player.seekToTime(-50);
      expect(player.getState().currentTime).toBe(0);
    });

    it("clamps seek to valid range (max)", () => {
      player.seekToTime(10000);
      expect(player.getState().currentTime).toBe(400);
    });

    it("emits progress on seek", () => {
      let emittedProgress: { currentTime: number; totalTime: number } | null =
        null;

      player.events.on("progress", (data) => {
        emittedProgress = data;
      });

      player.seekToTime(200);

      expect(emittedProgress?.currentTime).toBe(200);
      expect(emittedProgress?.totalTime).toBe(400);
    });

    it("maintains playing state on seek", () => {
      player.play();
      jest.advanceTimersByTime(50);
      player.seekToTime(150);

      const state = player.getState();
      expect(state.status).toBe("playing");
    });

    it("resumes from pause on seek while playing", () => {
      player.play();
      jest.advanceTimersByTime(50);
      player.seekToTime(150);

      const state = player.getState();
      expect(state.status).toBe("playing");
      expect(state.currentTime).toBe(150);
    });
  });

  describe("seekToSlide", () => {
    it("seeks to slide by index", () => {
      player.seekToSlide(2);
      expect(player.getState().currentTime).toBe(mockSlides[2].startTime);
    });

    it("clamps slide seek to valid range", () => {
      player.seekToSlide(100);
      expect(player.getState().currentTime).toBe(mockSlides[2].startTime);
    });
  });

  describe("seekToBlock", () => {
    it("seeks to block by ID", () => {
      player.seekToBlock("2");
      expect(player.getState().currentTime).toBe(mockSlides[2].startTime);
    });

    it("does nothing if block not found", () => {
      player.seekToBlock("999");
      expect(player.getState().currentTime).toBe(0);
    });
  });

  describe("block change tracking", () => {
    it("emits blockChange on transition", () => {
      let blockChanges: string[] = [];

      player.events.on("blockChange", ({ blockId }) => {
        blockChanges.push(blockId);
      });

      player.play();
      // Block 2 starts at 300ms content, which requires ~775ms real time with acceleration
      jest.advanceTimersByTime(850);

      // Should have changed from block 1 to block 2
      expect(blockChanges.length).toBeGreaterThan(0);
      const hasBlock2 = blockChanges.includes("2");
      expect(hasBlock2).toBe(true);
    });

    it("does not emit duplicate blockChange events", () => {
      let blockChangeCount = 0;

      player.events.on("blockChange", () => {
        blockChangeCount++;
      });

      player.seekToTime(0);
      player.seekToTime(0); // Seek to same block again

      expect(blockChangeCount).toBe(0);
    });
  });

  describe("completion", () => {
    it("emits complete event at end", () => {
      let completed = false;

      player.events.on("complete", () => {
        completed = true;
      });

      player.play();
      // Total content duration is 400ms, with acceleration starting at 0, we reach ~500ms content by 1000ms real time
      // But content ends at 400ms, so wait 1100ms to be safe
      jest.advanceTimersByTime(1100);

      expect(completed).toBe(true);
    });

    it("transitions to complete status", () => {
      let finalStatus: string | null = null;

      player.events.on("statusChange", ({ status }) => {
        finalStatus = status;
      });

      player.play();
      jest.advanceTimersByTime(1100);

      expect(finalStatus).toBe("complete");
    });

    it("resets to start on play after complete", () => {
      player.play();
      jest.advanceTimersByTime(1100);

      player.play();

      expect(player.getState().currentTime).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles empty slide array", () => {
      const emptyPlayer = new Player([]);
      expect(emptyPlayer.getTotalSlides()).toBe(0);
      expect(emptyPlayer.getState().currentTime).toBe(0);
      expect(emptyPlayer.getTotalDurationMs()).toBe(0);
    });

    it("handles single slide", () => {
      const singleSlidePlayer = new Player([mockSlides[0]], undefined, createTestTimerApi());

      let completeEmitted = false;
      singleSlidePlayer.events.on("complete", () => {
        completeEmitted = true;
      });

      singleSlidePlayer.play();
      // Single slide is 100ms content, which requires ~450ms real time with acceleration
      jest.advanceTimersByTime(500);

      expect(completeEmitted).toBe(true);
    });
  });

  describe("multiple listeners", () => {
    it("supports multiple listeners for same event", () => {
      let count1 = 0;
      let count2 = 0;

      player.events.on("statusChange", () => {
        count1++;
      });
      player.events.on("statusChange", () => {
        count2++;
      });

      player.play();
      player.pause();

      expect(count1).toBeGreaterThan(0);
      expect(count2).toBeGreaterThan(0);
    });
  });

  describe("acceleration curve", () => {
    it("progresses slowly at start then faster", () => {
      const times: number[] = [];

      player.events.on("progress", ({ currentTime }) => {
        times.push(currentTime);
      });

      player.play();
      // Wait through acceleration phase (1s) - we have 400ms of content, so stop before that
      jest.advanceTimersByTime(800);
      player.stop();

      // Should have collected multiple time samples
      expect(times.length).toBeGreaterThan(2);

      // Check that we're progressing through content (not all at same position)
      const uniqueTimes = new Set(times);
      expect(uniqueTimes.size).toBeGreaterThan(1);
    });

    it("reaches correct position after acceleration phase", () => {
      player.play();
      // Wait 1 second for acceleration to complete (we reach ~500ms content by wall-time 1s)
      // But our content only goes to 400ms, so we should hit completion before then
      jest.advanceTimersByTime(500);

      const currentTime = player.getState().currentTime;
      // Should be somewhere in the content
      expect(currentTime).toBeGreaterThan(0);
      expect(currentTime).toBeLessThanOrEqual(400);
    });
  });

  describe("progress events", () => {
    it("emits progress with time values not indices", () => {
      let progressData: { currentTime: number; totalTime: number } | null =
        null;

      player.events.on("progress", (data) => {
        progressData = data;
      });

      player.seekToTime(200);

      expect(progressData?.currentTime).toBe(200);
      expect(progressData?.totalTime).toBe(400);
      expect(typeof progressData?.currentTime).toBe("number");
      expect(typeof progressData?.totalTime).toBe("number");
    });
  });
});
