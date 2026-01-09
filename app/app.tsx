import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { parsePlainText } from "../src/parser/plaintext";
import { compile } from "../src/compiler/compile";
import { DEFAULT_TIMING_CONFIG, type TimingConfig } from "../src/timing/config";
import { Player } from "../src/player";
import type { Slide, Block } from "../src/types";

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
  blocks: Block[] | null;
  slides: Slide[] | null;
  mode: "document" | "reading"; // Within reading phase: show document or reading screen
}

function App() {
  const [state, setState] = useState<AppState>({
    phase: "paste",
    documentId: null,
    blocks: null,
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
      blocks: doc.blocks,
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

  if (state.phase === "reading" && state.documentId && state.slides && state.blocks) {
    return (
      <ReadingSession
        key={state.documentId}
        blocks={state.blocks}
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
  blocks: Block[];
  slides: Slide[];
  mode: "document" | "reading";
  onModeChange: (mode: "document" | "reading") => void;
}

function ReadingSession({ blocks, slides, mode, onModeChange }: ReadingSessionProps) {
  const [startFromSlideIndex, setStartFromSlideIndex] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);

  const handleStartFromWord = (slideIndex: number) => {
    setStartFromSlideIndex(slideIndex);
    onModeChange("reading");
  };

  const handleStopReading = () => {
    onModeChange("document");
  };

  return (
    <>
      <div style={{ display: mode === "document" ? "block" : "none" }}>
        <DocumentView
          blocks={blocks}
          slides={slides}
          currentSlide={mode === "document" ? currentSlide : null}
          onWordClick={handleStartFromWord}
        />
      </div>
      <div style={{ display: mode === "reading" ? "block" : "none" }}>
        <ReadingScreen
          slides={slides}
          startFromSlideIndex={startFromSlideIndex}
          onStopReading={handleStopReading}
          onCurrentSlideChange={setCurrentSlide}
        />
      </div>
    </>
  );
}

interface DocumentViewProps {
  blocks: Block[];
  slides: Slide[];
  currentSlide: Slide | null;
  onWordClick: (slideIndex: number) => void;
}

function DocumentView({ blocks, slides, currentSlide, onWordClick }: DocumentViewProps) {
  const currentWordRef = useRef<HTMLAnchorElement>(null);
  const currentSlideIndex = currentSlide ? slides.indexOf(currentSlide) : -1;

  // Group slides by block
  const slidesByBlock = new Map<string, Slide[]>();
  for (const slide of slides) {
    if (!slidesByBlock.has(slide.blockId)) {
      slidesByBlock.set(slide.blockId, []);
    }
    slidesByBlock.get(slide.blockId)!.push(slide);
  }

  // Scroll to current word when it changes
  useEffect(() => {
    if (currentWordRef.current) {
      currentWordRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentSlide]);

  return (
    <div className="document-view">
      {blocks.map((block) => {
        const blockSlides = slidesByBlock.get(block.id) || [];

        // Render block text with clickable word portions
        let textIndex = 0;
        const elements: React.ReactNode[] = [];

        blockSlides.forEach((slide, slideNum) => {
          // Find where this word appears in the block text
          // (simple approach: search for the word)
          const wordStart = block.text.indexOf(slide.word, textIndex);
          if (wordStart > textIndex) {
            // Add non-clickable text before the word
            elements.push(
              <span key={`text-${slideNum}`}>
                {block.text.slice(textIndex, wordStart)}
              </span>
            );
          }

          // Add the clickable word
          const slideIndex = slides.indexOf(slide);
          const isCurrent = currentSlideIndex === slideIndex;
          elements.push(
            <a
              key={`word-${slideNum}`}
              ref={isCurrent ? currentWordRef : null}
              href="#"
              className={`document-link ${isCurrent ? "document-link--current" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                onWordClick(slideIndex);
              }}
            >
              {slide.word}
            </a>
          );

          textIndex = wordStart + slide.word.length;
        });

        // Add remaining text after the last word
        if (textIndex < block.text.length) {
          elements.push(
            <span key="text-end">
              {block.text.slice(textIndex)}
            </span>
          );
        }

        return (
          <p key={block.id} className="document-block">
            {elements}
          </p>
        );
      })}
    </div>
  );
}

interface ReadingScreenProps {
  slides: Slide[];
  startFromSlideIndex: number | null;
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

function ReadingScreen({ slides, startFromSlideIndex, onStopReading, onCurrentSlideChange }: ReadingScreenProps) {
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
      setState(prev => {
        // If we've moved past the current slide into a gap, clear it
        if (prev.currentSlide && currentTime > prev.currentSlide.startTime + prev.currentSlide.duration) {
          return {
            ...prev,
            currentTime,
            totalTime,
            progress: totalTime > 0 ? (currentTime / totalTime) * 100 : 0,
            currentSlide: null,
          };
        }
        return {
          ...prev,
          currentTime,
          totalTime,
          progress: totalTime > 0 ? (currentTime / totalTime) * 100 : 0,
        };
      });
    });

    playerRef.current = player;
    const totalTime = player.getTotalDurationMs();

    setState(prev => ({
      ...prev,
      totalTime,
    }));

    // If starting from a specific slide, seek and play
    if (startFromSlideIndex !== null && startFromSlideIndex >= 0) {
      player.seekToSlide(startFromSlideIndex);
      player.play();
    }

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
      }
    };
  }, [slides, startFromSlideIndex]);

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
          <button className="btn btn-restart" onClick={handleRestart} title="Stop">
            ◾ Stop
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
