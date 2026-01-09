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

/**
 * Convert milliseconds to mm:ss format
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Generate a unique document ID
 */
function generateDocumentId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface AppState {
  phase: "paste" | "reading";
  documentId: string | null;
  slides: Slide[] | null;
  mode: "document" | "reading"; // Within reading phase: show document or reading screen
}

function App() {
  const [state, setState] = useState<AppState>({
    phase: "paste",
    documentId: null,
    slides: null,
    mode: "document",
  });

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadDocument = (text: string) => {
    const doc = parsePlainText(text);
    const slides = compile(doc, WEB_TIMING_CONFIG);

    if (slides.length === 0) {
      alert("No content to read");
      return;
    }

    const documentId = generateDocumentId();

    setState({
      phase: "reading",
      documentId,
      slides,
      mode: "document",
    });
  };

  // Handle global paste event
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text");
      if (!text) return;

      e.preventDefault();
      loadDocument(text);
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleStart = () => {
    const text = inputRef.current?.value;
    if (!text) {
      alert("Please paste or type some text");
      return;
    }
    loadDocument(text);
  };

  if (state.phase === "reading" && state.documentId && state.slides) {
    return (
      <ReadingSession
        key={state.documentId}
        slides={state.slides}
        mode={state.mode}
        onModeChange={(mode) =>
          setState(prev => ({ ...prev, mode }))
        }
      />
    );
  }

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
      />
      <button className="btn btn-start" onClick={handleStart}>
        Start Reading
      </button>
    </div>
  );
}

interface ReadingSessionProps {
  slides: Slide[];
  mode: "document" | "reading";
  onModeChange: (mode: "document" | "reading") => void;
}

function ReadingSession({ slides, mode, onModeChange }: ReadingSessionProps) {
  const [startFromBlockId, setStartFromBlockId] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);

  const handleStartFromBlock = (blockId: string) => {
    setStartFromBlockId(blockId);
    onModeChange("reading");
  };

  const handleStopReading = () => {
    onModeChange("document");
  };

  return (
    <>
      <div style={{ display: mode === "document" ? "block" : "none" }}>
        <DocumentView
          slides={slides}
          currentSlide={mode === "document" ? currentSlide : null}
          onWordClick={handleStartFromBlock}
        />
      </div>
      <div style={{ display: mode === "reading" ? "block" : "none" }}>
        <ReadingScreen
          slides={slides}
          startFromBlockId={startFromBlockId}
          onStopReading={handleStopReading}
          onCurrentSlideChange={setCurrentSlide}
        />
      </div>
    </>
  );
}

interface DocumentViewProps {
  slides: Slide[];
  currentSlide: Slide | null;
  onWordClick: (blockId: string) => void;
}

function DocumentView({ slides, currentSlide, onWordClick }: DocumentViewProps) {
  const currentWordRef = useRef<HTMLButtonElement>(null);
  const currentSlideIndex = currentSlide ? slides.indexOf(currentSlide) : -1;

  // Group slides by block
  const blocks = new Map<string, Slide[]>();
  for (const slide of slides) {
    if (!blocks.has(slide.blockId)) {
      blocks.set(slide.blockId, []);
    }
    blocks.get(slide.blockId)!.push(slide);
  }

  // Scroll to current word when it changes
  useEffect(() => {
    if (currentWordRef.current) {
      currentWordRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentSlide]);

  return (
    <div className="document-view">
      {Array.from(blocks.entries()).map(([blockId, blockSlides]) => (
        <div key={blockId} className="document-block">
          {blockSlides.map((slide) => {
            const slideIndex = slides.indexOf(slide);
            const isCurrent = currentSlideIndex === slideIndex;
            return (
              <button
                key={slideIndex}
                ref={isCurrent ? currentWordRef : null}
                className={`document-word ${isCurrent ? "document-word--current" : ""}`}
                onClick={() => onWordClick(blockId)}
                title={`Click to read from this block`}
              >
                {slide.word}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface ReadingScreenProps {
  slides: Slide[];
  startFromBlockId: string | null;
  onStopReading: () => void;
  onCurrentSlideChange: (slide: Slide | null) => void;
}

interface ReadingScreenState {
  currentSlide: Slide | null;
  currentTime: number;
  totalTime: number;
  playerStatus: "idle" | "playing" | "paused" | "complete";
  progress: number;
}

function ReadingScreen({ slides, startFromBlockId, onStopReading, onCurrentSlideChange }: ReadingScreenProps) {
  const [state, setState] = useState<ReadingScreenState>({
    currentSlide: slides[0] || null,
    currentTime: 0,
    totalTime: 0,
    playerStatus: "idle",
    progress: 0,
  });

  const playerRef = useRef<Player | null>(null);

  // Initialize player
  useEffect(() => {
    const player = new Player(slides);

    player.events.on("slide", ({ slide }) => {
      setState(prev => ({
        ...prev,
        currentSlide: slide,
      }));
      onCurrentSlideChange(slide);
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
    const totalTime = player.getTotalDurationMs();

    setState(prev => ({
      ...prev,
      totalTime,
    }));

    // If starting from a specific block, seek and play
    if (startFromBlockId) {
      const slideIndex = slides.findIndex(s => s.blockId === startFromBlockId);
      if (slideIndex >= 0) {
        player.seekToSlide(slideIndex);
      }
      player.play();
    }

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
      }
    };
  }, [slides, startFromBlockId]);

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
      onStopReading();
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || state.totalTime === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * state.totalTime;

    playerRef.current.seekToTime(time);
  };

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
