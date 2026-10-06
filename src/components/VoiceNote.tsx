"use client";

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Transition,
} from "motion/react";
import { cn } from "@/lib/utils";

const ICON: Transition = { type: "spring", duration: 0.34, bounce: 0.2 };
const TAP: Transition = { type: "spring", duration: 0.25, bounce: 0.3 };
const INSTANT: Transition = { duration: 0 };

const SPEEDS = [1, 1.5, 2];
const SEEK_STEP = 5;
const MIN_AMPLITUDE = 0.14;
const PEAK_RATIO = 0.72;

// Play triangle and pause bars for spring path morphing
const PLAY_SHAPE = [
  7.7, 5.8, 13, 8.9, 13, 15.1, 7.7, 18.2, 13, 8.9, 18.3, 12, 18.3, 12, 13, 15.1,
];
const PAUSE_SHAPE = [
  8.2, 6.8, 10.9, 6.8, 10.9, 17.2, 8.2, 17.2, 13.1, 6.8, 15.8, 6.8, 15.8, 17.2,
  13.1, 17.2,
];

const toPath = (shape: number[]) => {
  let d = "";
  for (let quad = 0; quad < shape.length; quad += 8) {
    d += `M${shape[quad]} ${shape[quad + 1]}`;
    for (let point = 2; point < 8; point += 2) {
      d += ` L${shape[quad + point]} ${shape[quad + point + 1]}`;
    }
    d += " Z";
  }
  return d;
};

const morph = (from: number[], to: number[], t: number) =>
  toPath(from.map((value, i) => value + (to[i] - value) * t));

const PLAY_PATH = toPath(PLAY_SHAPE);
const PAUSE_PATH = toPath(PAUSE_SHAPE);

const ICON_PAINT = {
  fill: "currentColor",
  stroke: "currentColor",
  strokeWidth: 1.2,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const formatTime = (seconds: number) => {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};

// Waveform deterministic PRNG generator
const buildWaveform = (count: number, seed: number) => {
  let state = (seed >>> 0) + 0x9e3779b9;
  return Array.from({ length: count }, (_, i) => {
    state = (state * 1664525 + 1013904223) >>> 0;
    const noise = state / 0x100000000;
    const envelope = Math.sin((Math.PI * (i + 0.5)) / count) ** 0.55;
    const swell = 0.5 + 0.5 * Math.sin(i * 0.9 + seed);
    const amplitude = envelope * (0.3 + 0.5 * noise + 0.2 * swell);
    return Math.round(clamp(amplitude, MIN_AMPLITUDE, 1) * 1000) / 1000;
  });
};

// Message bubble tails with solid fill
export const OutgoingTail: React.FC = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 17 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="absolute -bottom-[0.5px] -right-[5.5px] pointer-events-none text-[#007aff] z-0"
  >
    <path
      d="M11.5 10.5C12.0014 13.5086 14.8333 16.3333 16.5 17C10.1 17 6 14.8333 5 13.5L0 15L0.5 0H11V2V4V4.5C11 5.5 11 7.5 11.5 10.5Z"
      fill="currentColor"
    />
  </svg>
);

export const IncomingTail: React.FC = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 17 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="absolute -bottom-[0.5px] -left-[5.5px] pointer-events-none text-[#e9e9eb] dark:text-[#2c2c2e] z-0"
  >
    <path
      d="M5 10.5C4.49857 13.5086 1.66667 16.3333 0 17C6.4 17 10.5 14.8333 11.5 13.5L16.5 15L16 0H5.5V2V4V4.5C5.5 5.5 5.5 7.5 5 10.5Z"
      fill="currentColor"
    />
  </svg>
);

type GroupContext = { claim: (id: string, pause: () => void) => void };

const VoiceNoteGroupContext = createContext<GroupContext | null>(null);

export function VoiceNoteGroup({ children }: { children: ReactNode }) {
  const notes = useRef(new Map<string, () => void>());

  const claim = useCallback((id: string, pause: () => void) => {
    notes.current.set(id, pause);
    notes.current.forEach((stop, other) => other !== id && stop());
  }, []);

  const value = useMemo(() => ({ claim }), [claim]);

  return (
    <VoiceNoteGroupContext.Provider value={value}>
      {children}
    </VoiceNoteGroupContext.Provider>
  );
}

export type VoiceNoteProps = Omit<ComponentProps<"div">, "onEnded"> & {
  src?: string;
  duration?: number;
  waveform?: number[];
  bars?: number;
  seed?: number;
  playing?: boolean;
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  onEnded?: () => void;
  seekable?: boolean;
  speeds?: number[];
  onSpeedChange?: (speed: number) => void;
  variant?: "incoming" | "outgoing" | "default";
  isLoading?: boolean;
  onPlayRequest?: () => Promise<string | void>;
  // Message integration props
  messageTime?: string;
  statusIcon?: ReactNode;
  isLastInGroup?: boolean;
  layout?: "stacked" | "inline";
};

export function VoiceNote({
  src,
  duration = 15,
  waveform,
  bars = 32,
  seed = 7,
  playing,
  defaultPlaying = false,
  onPlayingChange,
  onEnded,
  seekable = true,
  speeds = SPEEDS,
  onSpeedChange,
  variant = "incoming",
  isLoading = false,
  onPlayRequest,
  messageTime,
  statusIcon,
  isLastInGroup = false,
  layout = "stacked",
  className,
  style,
  ...props
}: VoiceNoteProps) {
  const shouldReduceMotion = useReducedMotion();

  const amplitudes = useMemo(
    () => waveform ?? buildWaveform(Math.max(1, bars), seed),
    [waveform, bars, seed],
  );

  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);
  const startedAt = useRef(0);

  const [localSrc, setLocalSrc] = useState<string | undefined>(src);
  const [fetchingSrc, setFetchingSrc] = useState(false);
  const [metaDuration, setMetaDuration] = useState<number | null>(null);
  const [playingState, setPlayingState] = useState(defaultPlaying);
  const [elapsed, setElapsed] = useState(0);
  const [failed, setFailed] = useState(false);
  const [speed, setSpeed] = useState(speeds[0] ?? 1);

  const id = useId();
  const group = useContext(VoiceNoteGroupContext);

  useEffect(() => {
    if (src) setLocalSrc(src);
  }, [src]);

  const activeSrc = localSrc || src;
  const loading = isLoading || fetchingSrc;
  const blocked = loading || failed;

  const total = metaDuration ?? duration;
  const isControlled = playing !== undefined;
  const isPlaying = isControlled ? playing : playingState;

  const progress = useMotionValue(0);
  const clipPath = useTransform(
    progress,
    (p) => `inset(0 ${(1 - p) * 100}% 0 0)`,
  );

  const callbacks = useRef({ onEnded, onPlayingChange });
  useEffect(() => {
    callbacks.current = { onEnded, onPlayingChange };
  }, [onEnded, onPlayingChange]);

  const commitPlaying = useCallback(
    (next: boolean) => {
      if (!isControlled) setPlayingState(next);
      callbacks.current.onPlayingChange?.(next);
    },
    [isControlled],
  );

  const seekTo = useCallback(
    (ratio: number) => {
      const next = clamp(ratio);
      progress.set(next);
      setElapsed(Math.floor(next * total));
      startedAt.current = performance.now() - (next * total * 1000) / speed;
      const audio = audioRef.current;
      if (audio && Number.isFinite(total)) audio.currentTime = next * total;
    },
    [progress, total, speed],
  );

  const reset = useCallback(() => {
    if (progress.get() === 0) return;
    progress.set(0);
    setElapsed(0);
    const audio = audioRef.current;
    if (audio) audio.currentTime = 0;
    commitPlaying(false);
    callbacks.current.onEnded?.();
  }, [progress, commitPlaying]);

  useEffect(() => {
    if (!isPlaying || total <= 0) return;

    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = speed;
      audio.play().catch(() => commitPlaying(false));
    }
    startedAt.current =
      performance.now() - (progress.get() * total * 1000) / speed;

    let frame = 0;
    const tick = (now: number) => {
      const seconds = audio
        ? audio.currentTime
        : ((now - startedAt.current) / 1000) * speed;
      const ratio = clamp(seconds / total);
      progress.set(ratio);
      setElapsed(Math.floor(seconds));
      if (ratio < 1) {
        frame = requestAnimationFrame(tick);
        return;
      }
      reset();
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      audio?.pause();
    };
  }, [isPlaying, total, speed, progress, commitPlaying, reset]);

  const scrub = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (rect?.width) seekTo((event.clientX - rect.left) / rect.width);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!seekable || blocked) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    scrubbing.current = true;
    scrub(event);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!seekable || blocked || total <= 0) return;
    const at = progress.get() * total;
    const to = {
      ArrowLeft: at - SEEK_STEP,
      ArrowRight: at + SEEK_STEP,
      Home: 0,
      End: total,
    }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    seekTo(to / total);
  };

  const remaining = Math.max(0, total - elapsed);
  const slider = seekable
    ? {
      role: "slider" as const,
      tabIndex: 0,
      "aria-label": "Seek",
      "aria-valuemin": 0,
      "aria-valuemax": Math.round(total),
      "aria-valuenow": elapsed,
      "aria-valuetext": `${formatTime(elapsed)} of ${formatTime(total)}`,
    }
    : undefined;

  const handleControl = async () => {
    if (isPlaying) {
      commitPlaying(false);
      return;
    }

    if (!activeSrc && onPlayRequest) {
      setFetchingSrc(true);
      try {
        const fetchedUrl = await onPlayRequest();
        if (fetchedUrl) {
          setLocalSrc(fetchedUrl);
        }
      } catch (e) {
        console.error("Failed to load voice message audio", e);
        setFailed(true);
        setFetchingSrc(false);
        return;
      }
      setFetchingSrc(false);
    }

    commitPlaying(true);
    group?.claim(id, () => commitPlaying(false));
  };

  const cycleSpeed = () => {
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(next);
    onSpeedChange?.(next);
    const audio = audioRef.current;
    if (audio) audio.playbackRate = next;
  };

  const buttonSize = 38;

  return (
    <div
      data-slot="voice-note"
      data-playing={isPlaying || undefined}
      data-loading={loading || undefined}
      data-error={failed || undefined}
      className={cn(
        // Pure flat message bubble styling: ZERO shadows, clean native look
        "relative select-none",
        variant === "outgoing"
          ? cn(
            "bg-[#007aff] text-white",
            isLastInGroup ? "rounded-[18px_18px_4px_18px]" : "rounded-[18px]",
          )
          : variant === "incoming"
            ? cn(
              "bg-[#e9e9eb] dark:bg-[#2c2c2e] text-black dark:text-white",
              isLastInGroup ? "rounded-[18px_18px_18px_4px]" : "rounded-[18px]",
            )
            : "bg-[#e9e9eb] dark:bg-[#2c2c2e] rounded-full",
        layout === "stacked"
          ? "w-[245px] sm:w-[275px] pl-2.5 pr-3 pt-2 pb-1.5"
          : "inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full",
        className,
      )}
      style={style}
      {...props}
    >
      {layout === "stacked" ? (
        // Stacked Telegram/WhatsApp layout: waveform spans full top width, details below
        <div className="flex items-center gap-2.5 w-full">
          {/* Play/Pause control button without any shadows or double rings */}
          <motion.button
            data-slot="voice-note-control"
            type="button"
            onClick={handleControl}
            disabled={loading}
            aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
            whileTap={shouldReduceMotion || loading ? undefined : { scale: 0.92 }}
            transition={shouldReduceMotion ? INSTANT : TAP}
            style={{ width: buttonSize, height: buttonSize }}
            className={cn(
              "flex shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full outline-none focus:outline-none transition-transform",
              variant === "outgoing"
                ? "bg-white text-[#007aff] hover:bg-white/95"
                : "bg-[#007aff] text-white hover:bg-[#006bdc]",
              loading && "opacity-75 cursor-wait",
            )}
          >
            {loading ? (
              <svg
                className="animate-spin"
                style={{ width: 18, height: 18 }}
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            ) : (
              <TransportIcon
                playing={isPlaying}
                size={22}
                reduced={!!shouldReduceMotion}
              />
            )}
          </motion.button>

          {/* Right column: Waveform on full width + Duration/Timestamp below */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
            {/* Waveform track */}
            <div
              ref={trackRef}
              data-slot="voice-note-track"
              {...slider}
              onPointerDown={handlePointerDown}
              onPointerMove={(event) => scrubbing.current && scrub(event)}
              onPointerUp={() => (scrubbing.current = false)}
              onPointerCancel={() => (scrubbing.current = false)}
              onKeyDown={handleKeyDown}
              className={cn(
                "relative h-5 w-full flex items-center touch-none rounded-sm outline-none",
                seekable && !blocked && "cursor-pointer",
                blocked && "opacity-40",
              )}
            >
              <Bars
                amplitudes={amplitudes}
                className={
                  variant === "outgoing"
                    ? "bg-white/35"
                    : "bg-[#8e8e93]/40 dark:bg-white/30"
                }
              />
              <motion.div
                aria-hidden
                className="absolute inset-0 flex items-center"
                style={{ clipPath }}
              >
                <Bars
                  amplitudes={amplitudes}
                  className={
                    variant === "outgoing"
                      ? "bg-white"
                      : "bg-[#007aff]"
                  }
                />
              </motion.div>
            </div>

            {/* Bottom info row: Audio duration/speed on left, Message timestamp on right */}
            <div className="flex items-center justify-between text-[11px] leading-none select-none pr-0.5">
              <TimeLabel
                speed={speed}
                variant={variant}
                onCycle={speeds.length > 1 ? cycleSpeed : undefined}
              >
                {formatTime(isPlaying ? remaining : total)}
              </TimeLabel>

              {messageTime && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-[10px]",
                    variant === "outgoing" ? "text-white/75" : "text-[#8e8e93]",
                  )}
                >
                  <span>{messageTime}</span>
                  {statusIcon}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Inline single-row layout
        <>
          <motion.button
            data-slot="voice-note-control"
            type="button"
            onClick={handleControl}
            disabled={loading}
            aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
            whileTap={shouldReduceMotion || loading ? undefined : { scale: 0.92 }}
            transition={shouldReduceMotion ? INSTANT : TAP}
            style={{ width: buttonSize, height: buttonSize }}
            className={cn(
              "flex shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full outline-none focus:outline-none transition-transform",
              variant === "outgoing"
                ? "bg-white text-[#007aff] hover:bg-white/95"
                : "bg-[#007aff] text-white hover:bg-[#006bdc]",
              loading && "opacity-75 cursor-wait",
            )}
          >
            {loading ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <TransportIcon playing={isPlaying} size={22} reduced={!!shouldReduceMotion} />
            )}
          </motion.button>

          <div
            ref={trackRef}
            data-slot="voice-note-track"
            {...slider}
            onPointerDown={handlePointerDown}
            onPointerMove={(event) => scrubbing.current && scrub(event)}
            onPointerUp={() => (scrubbing.current = false)}
            onPointerCancel={() => (scrubbing.current = false)}
            onKeyDown={handleKeyDown}
            className="relative h-5 flex-1 flex items-center touch-none rounded-sm outline-none cursor-pointer"
          >
            <Bars
              amplitudes={amplitudes}
              className={variant === "outgoing" ? "bg-white/35" : "bg-[#8e8e93]/40 dark:bg-white/30"}
            />
            <motion.div aria-hidden className="absolute inset-0 flex items-center" style={{ clipPath }}>
              <Bars
                amplitudes={amplitudes}
                className={variant === "outgoing" ? "bg-white" : "bg-[#007aff]"}
              />
            </motion.div>
          </div>

          <TimeLabel
            speed={speed}
            variant={variant}
            onCycle={speeds.length > 1 ? cycleSpeed : undefined}
          >
            {formatTime(isPlaying ? remaining : total)}
          </TimeLabel>

          {messageTime && (
            <div
              className={cn(
                "flex items-center gap-1 text-[10px] pl-1",
                variant === "outgoing" ? "text-white/75" : "text-[#8e8e93]",
              )}
            >
              <span>{messageTime}</span>
              {statusIcon}
            </div>
          )}
        </>
      )}

      {/* Solid bubble tail seamlessly attached to the corner */}
      {isLastInGroup && (variant === "outgoing" ? <OutgoingTail /> : <IncomingTail />)}

      {activeSrc && (
        <audio
          ref={audioRef}
          className="hidden"
          src={activeSrc}
          preload="metadata"
          onLoadedMetadata={(event) => {
            const value = event.currentTarget.duration;
            if (Number.isFinite(value) && value > 0) {
              setMetaDuration(value);
            }
          }}
          onError={() => {
            console.warn("Audio element error on", activeSrc);
          }}
          onEnded={reset}
        />
      )}
    </div>
  );
}

function TransportIcon({
  playing,
  size,
  reduced,
}: {
  playing: boolean;
  size: number;
  reduced: boolean;
}) {
  const shape = useMotionValue(playing ? PAUSE_PATH : PLAY_PATH);
  const previous = useRef(playing);

  useEffect(() => {
    if (previous.current === playing) return;
    previous.current = playing;
    shape.set(playing ? PAUSE_PATH : PLAY_PATH);
    if (reduced) return;

    const from = playing ? PLAY_SHAPE : PAUSE_SHAPE;
    const to = playing ? PAUSE_SHAPE : PLAY_SHAPE;
    const controls = animate(0, 1, {
      ...ICON,
      onUpdate: (t) => shape.set(morph(from, to, clamp(t))),
      onComplete: () => shape.set(playing ? PAUSE_PATH : PLAY_PATH),
    });
    return () => controls.stop();
  }, [playing, reduced, shape]);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
    >
      <motion.path d={shape} {...ICON_PAINT} />
    </svg>
  );
}

function TimeLabel({
  speed,
  text,
  variant,
  onCycle,
  children,
}: {
  speed: number;
  text?: string;
  variant?: "incoming" | "outgoing" | "default";
  onCycle?: () => void;
  children: ReactNode;
}) {
  const className = cn(
    "flex shrink-0 items-center gap-1 font-semibold tabular-nums text-[11px]",
    text,
    variant === "outgoing"
      ? "text-white/85"
      : "text-[#8e8e93] dark:text-[#a1a1a6]",
  );

  if (!onCycle) {
    return (
      <span data-slot="voice-note-time" className={className}>
        {children}
      </span>
    );
  }

  return (
    <button
      data-slot="voice-note-time"
      type="button"
      onClick={onCycle}
      aria-label={`Playback speed, ${speed} times. Press to change`}
      className={cn(
        className,
        "cursor-pointer rounded-full outline-none focus:outline-none transition-transform active:scale-95",
      )}
    >
      {children}
      {speed !== 1 && (
        <span
          className={cn(
            "rounded-full px-1 py-px text-[0.85em] leading-none font-bold",
            variant === "outgoing"
              ? "bg-white/25 text-white"
              : "bg-black/10 dark:bg-white/15 text-black/80 dark:text-white/90",
          )}
        >
          {speed}×
        </span>
      )}
    </button>
  );
}

const Bars = memo(function Bars({
  amplitudes,
  className,
}: {
  amplitudes: number[];
  className: string;
}) {
  return (
    <div className="flex h-full w-full items-center gap-[2.5px]">
      {amplitudes.map((amplitude, i) => (
        <span
          key={i}
          className={cn("flex-1 rounded-full", className)}
          style={{
            minWidth: 2,
            height: `${Math.max(12, amplitude * PEAK_RATIO * 100).toFixed(2)}%`,
          }}
        />
      ))}
    </div>
  );
});

export default VoiceNote;
