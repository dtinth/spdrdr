import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { parsePlainText } from "../src/parser/plaintext";
import { compile } from "../src/compiler/compile";
import { DEFAULT_TIMING_CONFIG, type TimingConfig } from "../src/timing/config";
import { Player } from "../src/player";
import type { Slide } from "../src/types";

// Web app timing config (640 WPM for RSVP)
const WEB_TIMING_CONFIG: TimingConfig = {
  ...DEFAULT_TIMING_CONFIG,
  wpm: 640,
};

interface AppState {
  phase: "paste" | "reading";
  slides: Slide[] | null;
  currentSlide: Slide | null;
  currentTime: number; // milliseconds
  totalTime: number; // milliseconds
  playerStatus: "idle" | "playing" | "paused" | "complete";
  progress: number; // 0-100 percentage
}

/**
 * Convert milliseconds to mm:ss format
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function App() {
  const [state, setState] = useState<AppState>({
    phase: "paste",
    slides: null,
    currentSlide: null,
    currentTime: 0,
    totalTime: 0,
    playerStatus: "idle",
    progress: 0,
  });

  const playerRef = useRef<Player | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Create and subscribe to player events
   */
  const createAndSetupPlayer = (slides: Slide[]) => {
    const player = new Player(slides);

    player.events.on("slide", ({ slide }) => {
      setState(prev => ({
        ...prev,
        currentSlide: slide,
      }));
    });

    player.events.on("statusChange", ({ status }) => {
      setState(prev => ({
        ...prev,
        playerStatus: status,
      }));
    });

    player.events.on("progress", ({ currentTime, totalTime }) => {
      setState(prev => ({
        ...prev,
        currentTime,
        totalTime,
        progress: totalTime > 0 ? (currentTime / totalTime) * 100 : 0,
      }));
    });

    playerRef.current = player;
    return player;
  };

  // Handle paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Handle paste in both paste screen and reading screen
      const text = e.clipboardData?.getData("text");
      if (!text) return;

      e.preventDefault();

      // Parse and compile
      const doc = parsePlainText(text);
      const slides = compile(doc, WEB_TIMING_CONFIG);

      if (slides.length === 0) {
        alert("No content to read");
        return;
      }

      const player = createAndSetupPlayer(slides);

      const totalTime = player.getTotalDurationMs();

      setState(prev => ({
        ...prev,
        phase: "reading",
        slides,
        currentSlide: slides[0],
        currentTime: 0,
        totalTime,
        playerStatus: "idle",
        progress: 0,
      }));

      // Auto-start playing
      player.play();
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handlePlayPause = () => {
    if (playerRef.current) {
      playerRef.current.toggle();
    }
  };

  const handleRestart = () => {
    if (playerRef.current) {
      playerRef.current.stop();
      setState(prev => ({
        ...prev,
        playerStatus: "idle",
        progress: 0,
        currentTime: 0,
      }));
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || state.totalTime === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * state.totalTime;

    playerRef.current.seekToTime(time);
  };

  if (state.phase === "paste") {
    return (
      <div className="container paste-screen">
        <div className="paste-hint">
          <h1>spdrdr</h1>
          <p>Press <kbd>Cmd/Ctrl</kbd> + <kbd>V</kbd> to paste and start reading</p>
          <p className="hint-sub">Or paste text from your clipboard</p>
        </div>
        <textarea
          ref={inputRef}
          className="paste-input"
          placeholder="Paste your text here..."
          onPaste={(e) => {
            const text = e.clipboardData?.getData("text");
            if (text) {
              const doc = parsePlainText(text);
              const slides = compile(doc, DEFAULT_TIMING_CONFIG);

              if (slides.length === 0) {
                alert("No content to read");
                return;
              }

              const player = createAndSetupPlayer(slides);

              const totalTime = player.getTotalDurationMs();

              setState(prev => ({
                ...prev,
                phase: "reading",
                slides,
                currentSlide: slides[0],
                currentTime: 0,
                totalTime,
                playerStatus: "idle",
                progress: 0,
              }));

              player.play();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="container reading-screen">
      <div className="reader">
        <div className="word-display">
          {state.currentSlide && (
            <Word
              word={state.currentSlide.word}
              pivotIndex={state.currentSlide.pivotIndex}
            />
          )}
        </div>

        <div className="controls">
          <button
            className="btn btn-play"
            onClick={handlePlayPause}
            title={state.playerStatus === "playing" ? "Pause" : "Play"}
          >
            {state.playerStatus === "playing" ? "⏸ Pause" : "▶ Play"}
          </button>
          <button className="btn btn-restart" onClick={handleRestart} title="Restart">
            ↺ Restart
          </button>
        </div>

        <div className="progress-container" onClick={handleProgressClick}>
          <div className="progress-bar" style={{ width: `${state.progress}%` }} />
        </div>

        <div className="info">
          <span>
            {formatTime(state.currentTime)} / {formatTime(state.totalTime)}
          </span>
          <span className="status">{state.playerStatus}</span>
        </div>
      </div>
    </div>
  );
}

function Word({ word, pivotIndex }: { word: string; pivotIndex: number }) {
  const before = word.slice(0, pivotIndex);
  const orp = word[pivotIndex] || " ";
  const after = word.slice(pivotIndex + 1);

  return (
    <div className="word">
      <span className="before">{before}</span>
      <span className="orp">{orp}</span>
      <span className="after">{after}</span>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
