import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { Player } from "../src/player";
import type { Slide } from "../src/types";

// Mock slides for testing
const mockSlides: Slide[] = [
  {
    word: "Hello",
    pivotIndex: 1,
    duration: 100,
    blockId: "1",
    wordIndex: 0,
    isBlockEnd: false,
    isDocumentEnd: false,
  },
  {
    word: "world",
    pivotIndex: 2,
    duration: 100,
    blockId: "1",
    wordIndex: 1,
    isBlockEnd: true,
    isDocumentEnd: false,
  },
  {
    word: "Goodbye",
    pivotIndex: 2,
    duration: 100,
    blockId: "2",
    wordIndex: 0,
    isBlockEnd: true,
    isDocumentEnd: true,
  },
];

describe("Player", () => {
  let player: Player;

  beforeEach(() => {
    player = new Player(mockSlides);
  });

  afterEach(() => {
    player.stop();
  });

  describe("initialization", () => {
    it("starts in idle state", () => {
      const state = player.getState();
      expect(state.status).toBe("idle");
      expect(state.currentIndex).toBe(0);
    });

    it("has correct total slides", () => {
      expect(player.getTotalSlides()).toBe(3);
    });
  });

  describe("play and pause", () => {
    it("transitions to playing state", async () => {
      let emittedStatus: string | null = null;
      player.events.on("statusChange", ({ status }) => {
        emittedStatus = status;
      });

      player.play();
      const state = player.getState();

      expect(state.status).toBe("playing");
      expect(emittedStatus).toBe("playing");
    });

    it("emits first slide on play", async () => {
      let emittedSlide: Slide | null = null;
      player.events.on("slide", ({ slide }) => {
        emittedSlide = slide;
      });

      player.play();

      // Give time for emission
      await new Promise(resolve => setTimeout(resolve, 10));

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
      player.seekTo(2);
      player.stop();

      const state = player.getState();
      expect(state.status).toBe("idle");
      expect(state.currentIndex).toBe(0);
    });

    it("emits idle status and zero progress", () => {
      let emittedStatus: string | null = null;
      let emittedProgress: { current: number; total: number } | null = null;

      player.events.on("statusChange", ({ status }) => {
        emittedStatus = status;
      });
      player.events.on("progress", (data) => {
        emittedProgress = data;
      });

      player.play();
      player.stop();

      expect(emittedStatus).toBe("idle");
      expect(emittedProgress?.current).toBe(0);
    });
  });

  describe("seek", () => {
    it("seeks to specific index", () => {
      player.seekTo(1);
      expect(player.getState().currentIndex).toBe(1);
    });

    it("clamps seek to valid range (min)", () => {
      player.seekTo(-5);
      expect(player.getState().currentIndex).toBe(0);
    });

    it("clamps seek to valid range (max)", () => {
      player.seekTo(100);
      expect(player.getState().currentIndex).toBe(2);
    });

    it("emits progress on seek", () => {
      let emittedProgress: { current: number; total: number } | null = null;

      player.events.on("progress", (data) => {
        emittedProgress = data;
      });

      player.seekTo(2);

      expect(emittedProgress?.current).toBe(2);
      expect(emittedProgress?.total).toBe(3);
    });

    it("maintains playing state on seek", async () => {
      player.play();
      await new Promise(resolve => setTimeout(resolve, 50));
      player.seekTo(1);

      const state = player.getState();
      expect(state.status).toBe("playing");
    });

    it("resumes from pause on seek while playing", async () => {
      player.play();
      await new Promise(resolve => setTimeout(resolve, 50));
      player.seekTo(1);

      const state = player.getState();
      expect(state.status).toBe("playing");
      expect(state.currentIndex).toBe(1);
    });
  });

  describe("seekToBlock", () => {
    it("seeks to block by ID", () => {
      player.seekToBlock("2");
      expect(player.getState().currentIndex).toBe(2);
    });

    it("does nothing if block not found", () => {
      player.seekToBlock("999");
      expect(player.getState().currentIndex).toBe(0);
    });
  });

  describe("block change tracking", () => {
    it("emits blockChange on transition", async () => {
      let blockChanges: string[] = [];

      player.events.on("blockChange", ({ blockId }) => {
        blockChanges.push(blockId);
      });

      player.play();
      await new Promise(resolve => setTimeout(resolve, 250));

      // Should have changed from block 1 to block 2
      expect(blockChanges.length).toBeGreaterThan(0);
      expect(blockChanges[blockChanges.length - 1]).toBe("2");
    });

    it("does not emit duplicate blockChange events", async () => {
      let blockChangeCount = 0;

      player.events.on("blockChange", () => {
        blockChangeCount++;
      });

      player.seekTo(0);
      player.seekTo(0); // Seek to same block again

      expect(blockChangeCount).toBe(0);
    });
  });

  describe("completion", () => {
    it("emits complete event at end", async () => {
      let completed = false;

      player.events.on("complete", () => {
        completed = true;
      });

      player.play();
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(completed).toBe(true);
    });

    it("transitions to complete status", async () => {
      let finalStatus: string | null = null;

      player.events.on("statusChange", ({ status }) => {
        finalStatus = status;
      });

      player.play();
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(finalStatus).toBe("complete");
    });

    it("resets to start on play after complete", async () => {
      player.play();
      await new Promise(resolve => setTimeout(resolve, 350));

      player.play();

      expect(player.getState().currentIndex).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles empty slide array", () => {
      const emptyPlayer = new Player([]);
      expect(emptyPlayer.getTotalSlides()).toBe(0);
      expect(emptyPlayer.getState().currentIndex).toBe(0);
    });

    it("handles single slide", async () => {
      const singleSlidePlayer = new Player([mockSlides[0]]);

      let completeEmitted = false;
      singleSlidePlayer.events.on("complete", () => {
        completeEmitted = true;
      });

      singleSlidePlayer.play();
      await new Promise(resolve => setTimeout(resolve, 150));

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
});
