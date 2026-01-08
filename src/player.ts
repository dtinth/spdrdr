import mitt from "mitt";
import type { Slide } from "./types";

export interface PlayerState {
  status: "idle" | "playing" | "paused" | "complete";
  currentIndex: number;
}

export interface PlayerEvents {
  slide: { slide: Slide; index: number };
  blockChange: { blockId: string };
  statusChange: { status: PlayerState["status"] };
  progress: { current: number; total: number };
  complete: void;
}

/**
 * Player: Playback engine for slides
 * Manages timing, state, and playback controls with event-based architecture
 */
export class Player {
  private slides: Slide[];
  private state: PlayerState;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastBlockId: string | null = null;
  public events = mitt<PlayerEvents>();

  constructor(slides: Slide[]) {
    this.slides = slides;
    this.state = {
      status: "idle",
      currentIndex: 0,
    };
  }

  /**
   * Start playback from current position
   */
  play(): void {
    if (this.state.status === "playing") {
      return; // Already playing
    }

    if (this.state.currentIndex >= this.slides.length) {
      // Reset if we're at the end
      this.state.currentIndex = 0;
    }

    this.state.status = "playing";
    this.events.emit("statusChange", { status: "playing" });
    this.playNext();
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }

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
    this.pause();
    this.state.currentIndex = 0;
    this.state.status = "idle";
    this.events.emit("statusChange", { status: "idle" });
    this.events.emit("progress", { current: 0, total: this.slides.length });
  }

  /**
   * Seek to a specific slide index
   */
  seekTo(index: number): void {
    const wasPlaying = this.state.status === "playing";

    if (wasPlaying) {
      this.pause();
    }

    this.state.currentIndex = Math.max(0, Math.min(index, this.slides.length - 1));
    this.events.emit("progress", {
      current: this.state.currentIndex,
      total: this.slides.length,
    });

    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Seek to a specific block by ID
   */
  seekToBlock(blockId: string): void {
    const index = this.slides.findIndex(slide => slide.blockId === blockId);
    if (index >= 0) {
      this.seekTo(index);
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
   * Internal: Play the next slide and schedule the one after
   */
  private playNext(): void {
    if (this.state.currentIndex >= this.slides.length) {
      // Reached the end
      this.state.status = "complete";
      this.events.emit("statusChange", { status: "complete" });
      this.events.emit("complete");
      return;
    }

    const slide = this.slides[this.state.currentIndex];

    // Check for block change
    if (slide.blockId !== this.lastBlockId) {
      this.lastBlockId = slide.blockId;
      this.events.emit("blockChange", { blockId: slide.blockId });
    }

    // Emit slide event
    this.events.emit("slide", { slide, index: this.state.currentIndex });

    // Emit progress
    this.events.emit("progress", {
      current: this.state.currentIndex,
      total: this.slides.length,
    });

    // Schedule next slide
    this.timer = setTimeout(() => {
      this.state.currentIndex++;
      this.playNext();
    }, slide.duration);
  }
}
