import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { parsePlainText } from "../src/parser/plaintext";
import { compile } from "../src/compiler/compile";
import { DEFAULT_TIMING_CONFIG } from "../src/timing/config";
import { Player } from "../src/player";
import type { Slide } from "../src/types";

interface AppState {
  phase: "paste" | "reading";
  slides: Slide[] | null;
  currentSlide: Slide | null;
  currentIndex: number;
  playerStatus: "idle" | "playing" | "paused" | "complete";
  progress: number;
}

function App() {
  const [state, setState] = useState<AppState>({
    phase: "paste",
    slides: null,
    currentSlide: null,
    currentIndex: 0,
    playerStatus: "idle",
    progress: 0,
  });

  const playerRef = useRef<Player | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Handle paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (state.phase !== "paste") return;

      const text = e.clipboardData?.getData("text");
      if (!text) return;

      e.preventDefault();

      // Parse and compile
      const doc = parsePlainText(text);
      const slides = compile(doc, DEFAULT_TIMING_CONFIG);

      if (slides.length === 0) {
        alert("No content to read");
        return;
      }

      // Create player
      const player = new Player(slides);

      player.events.on("slide", ({ slide, index }) => {
        setState(prev => ({
          ...prev,
          currentSlide: slide,
          currentIndex: index,
        }));
      });

      player.events.on("statusChange", ({ status }) => {
        setState(prev => ({
          ...prev,
          playerStatus: status,
        }));
      });

      player.events.on("progress", ({ current, total }) => {
        setState(prev => ({
          ...prev,
          progress: total > 0 ? (current / total) * 100 : 0,
        }));
      });

      playerRef.current = player;

      setState(prev => ({
        ...prev,
        phase: "reading",
        slides,
        currentSlide: slides[0],
        currentIndex: 0,
        playerStatus: "idle",
        progress: 0,
      }));

      // Auto-start playing
      player.play();
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [state.phase]);

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
        currentIndex: 0,
      }));
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !state.slides) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const index = Math.floor(percent * state.slides.length);

    playerRef.current.seekTo(index);
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

              const player = new Player(slides);

              player.events.on("slide", ({ slide, index }) => {
                setState(prev => ({
                  ...prev,
                  currentSlide: slide,
                  currentIndex: index,
                }));
              });

              player.events.on("statusChange", ({ status }) => {
                setState(prev => ({
                  ...prev,
                  playerStatus: status,
                }));
              });

              player.events.on("progress", ({ current, total }) => {
                setState(prev => ({
                  ...prev,
                  progress: total > 0 ? (current / total) * 100 : 0,
                }));
              });

              playerRef.current = player;

              setState(prev => ({
                ...prev,
                phase: "reading",
                slides,
                currentSlide: slides[0],
                currentIndex: 0,
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
            {state.currentIndex + 1} / {state.slides?.length || 0}
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

  // Calculate character width in pixels (approximate)
  // For monospace-like rendering, each character is roughly 0.5em
  const charWidth = 0.5; // em units
  const offsetEm = pivotIndex * charWidth;

  return (
    <div className="word" style={{ marginLeft: `calc(-${offsetEm}em)` }}>
      <span className="before">{before}</span>
      <span className="orp">{orp}</span>
      <span className="after">{after}</span>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
