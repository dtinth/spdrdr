import mitt from "mitt";
import type { Slide } from "./types";
import {
  getPlaybackPosition,
  DEFAULT_ACCELERATION_CONFIG,
  type AccelerationConfig,
} from "./timing/acceleration";

export interface PlayerState {
  status: "idle" | "playing" | "paused" | "complete";
  currentTime: number; // Current playback position in milliseconds
}

export interface PlayerEvents {
  slide: { slide: Slide; index: number };
  blockChange: { blockId: string };
  statusChange: { status: PlayerState["status"] };
  progress: { currentTime: number; totalTime: number };
  complete: void;
  [key: string]: unknown;
  [key: symbol]: unknown;
}

export interface TimerApi {
  requestAnimationFrame(callback: () => void): number;
  cancelAnimationFrame(id: number): void;
}

/**
 * Player: Time-based playback engine for slides
 *
 * Architecture:
 * - Tracks currentTime (playback position in ms) instead of slide index
 * - Uses acceleration curve for first 1s of playback (slow-start)
 * - Calculates which slide to display based on currentTime
 * - Updates at 60fps during playback
 */
export class Player {
  private slides: Slide[];
  private state: PlayerState;
  private animationFrameId: number | null = null;
  private lastBlockId: string | null = null;
  private wallClockStartTime: number = 0; // When play() was called
  private playbackBasePosition: number = 0; // Base position for acceleration offset
  private accelerationConfig: AccelerationConfig;
  private timerApi: TimerApi;
  public events = mitt<PlayerEvents>();

  constructor(
    slides: Slide[],
    accelerationConfig?: AccelerationConfig,
    timerApi?: TimerApi
  ) {
    this.slides = slides;
    this.accelerationConfig = accelerationConfig || DEFAULT_ACCELERATION_CONFIG;
    this.timerApi = timerApi || {
      requestAnimationFrame: (callback) => requestAnimationFrame(callback),
      cancelAnimationFrame: (id) => cancelAnimationFrame(id),
    };
    this.state = {
      status: "idle",
      currentTime: 0,
    };
  }

  /**
   * Get total duration of all slides including gaps
   */
  private getTotalDuration(): number {
    if (this.slides.length === 0) {
      return 0;
    }
    const lastSlide = this.slides[this.slides.length - 1];
    if (!lastSlide) throw new Error("Last slide is undefined");
    return lastSlide.startTime + lastSlide.duration;
  }

  /**
   * Find the slide at a given playback time
   */
  private findSlideAtTime(time: number): Slide | null {
    for (const slide of this.slides) {
      const slideEndTime = slide.startTime + slide.duration;
      if (time >= slide.startTime && time < slideEndTime) {
        return slide;
      }
    }
    return null;
  }

  /**
   * Find the index of the slide at a given playback time
   */
  private findSlideIndexAtTime(time: number): number {
    for (let i = 0; i < this.slides.length; i++) {
      const slide = this.slides[i];
      if (!slide) throw new Error(`Slide at index ${i} is undefined`);
      const slideEndTime = slide.startTime + slide.duration;
      if (time >= slide.startTime && time < slideEndTime) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Update playback position and emit events
   */
  private updatePlayback(elapsedWallClockTime: number): void {
    // Get the acceleration offset (starts at 0, increases as we accelerate)
    const accelerationOffset = getPlaybackPosition(
      elapsedWallClockTime,
      this.accelerationConfig
    );
    const totalDuration = this.getTotalDuration();

    // Apply acceleration offset to the base position where we resumed
    const playbackPosition = this.playbackBasePosition + accelerationOffset;
    // Clamp to valid range
    this.state.currentTime = Math.min(playbackPosition, totalDuration);

    // Check if we've reached the end
    if (this.state.currentTime >= totalDuration) {
      this.state.status = "complete";
      this.events.emit("statusChange", { status: "complete" });
      this.events.emit("complete");
      this.stopAnimation();
      return;
    }

    // Find current slide
    const slideIndex = this.findSlideIndexAtTime(this.state.currentTime);
    if (slideIndex >= 0) {
      const slide = this.slides[slideIndex];
      if (!slide) throw new Error(`Slide at index ${slideIndex} is undefined`);

      // Check for block change
      if (slide.blockId !== this.lastBlockId) {
        this.lastBlockId = slide.blockId;
        this.events.emit("blockChange", { blockId: slide.blockId });
      }

      // Emit slide event
      this.events.emit("slide", { slide, index: slideIndex });
    }

    // Emit progress
    this.events.emit("progress", {
      currentTime: this.state.currentTime,
      totalTime: totalDuration,
    });
  }

  /**
   * Animation loop for playback
   */
  private animate = (): void => {
    if (this.state.status !== "playing") {
      return;
    }

    const elapsedTime = Date.now() - this.wallClockStartTime;
    this.updatePlayback(elapsedTime);

    if (this.state.status === "playing") {
      this.animationFrameId = this.timerApi.requestAnimationFrame(this.animate);
    }
  };

  /**
   * Stop animation loop
   */
  private stopAnimation(): void {
    if (this.animationFrameId !== null) {
      this.timerApi.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Start playback from current position
   */
  play(): void {
    if (this.state.status === "playing") {
      return; // Already playing
    }

    // Reset to beginning if at the end
    if (this.state.currentTime >= this.getTotalDuration()) {
      this.state.currentTime = 0;
    }

    this.state.status = "playing";
    // Start fresh acceleration from current position
    this.playbackBasePosition = this.state.currentTime;
    this.wallClockStartTime = Date.now();

    this.events.emit("statusChange", { status: "playing" });
    this.animationFrameId = this.timerApi.requestAnimationFrame(this.animate);
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.stopAnimation();
    this.state.status = "paused";
    this.events.emit("statusChange", { status: "paused" });
  }

  /**
   * Toggle between play and pause
   */
  toggle(): void {
    if (this.state.status === "playing") {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Stop playback and reset to start
   */
  stop(): void {
    this.stopAnimation();
    this.state.currentTime = 0;
    this.state.status = "idle";
    this.lastBlockId = null;
    this.events.emit("statusChange", { status: "idle" });
    this.events.emit("progress", { currentTime: 0, totalTime: this.getTotalDuration() });
  }

  /**
   * Seek to a specific time (milliseconds)
   */
  seekToTime(time: number): void {
    const wasPlaying = this.state.status === "playing";

    if (wasPlaying) {
      this.pause();
    }

    this.state.currentTime = Math.max(0, Math.min(time, this.getTotalDuration()));

    // Update block tracking when seeking
    this.lastBlockId = null;
    const slideIndex = this.findSlideIndexAtTime(this.state.currentTime);
    if (slideIndex >= 0) {
      const slide = this.slides[slideIndex];
      if (!slide) throw new Error(`Slide at index ${slideIndex} is undefined`);
      this.lastBlockId = slide.blockId;
    }

    this.events.emit("progress", {
      currentTime: this.state.currentTime,
      totalTime: this.getTotalDuration(),
    });

    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Seek to a specific slide index (convenience wrapper)
   */
  seekToSlide(index: number): void {
    const clampedIndex = Math.max(0, Math.min(index, this.slides.length - 1));
    if (this.slides[clampedIndex]) {
      this.seekToTime(this.slides[clampedIndex].startTime);
    }
  }

  /**
   * Seek to a specific block by ID
   */
  seekToBlock(blockId: string): void {
    const index = this.slides.findIndex(slide => slide.blockId === blockId);
    if (index >= 0) {
      this.seekToSlide(index);
    }
  }

  /**
   * Get current player state
   */
  getState(): PlayerState {
    return { ...this.state };
  }

  /**
   * Get total number of slides
   */
  getTotalSlides(): number {
    return this.slides.length;
  }

  /**
   * Get total duration of all slides in milliseconds
   */
  getTotalDurationMs(): number {
    return this.getTotalDuration();
  }
}
