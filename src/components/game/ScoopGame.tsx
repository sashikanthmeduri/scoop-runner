import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Pause, Play, Trophy, Volume2, VolumeX } from "lucide-react";
import { ScoopEngine, type HudSnapshot, type RunResult } from "@/lib/game/engine";
import { detectCountry, listScores, submitScore, type ScoreRow } from "@/lib/scoreboard";
import { flagUrl, guessCountryClient } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Screen = "title" | "playing" | "byline" | "board";

const NAME_KEY = "scoop-runner-byline";
const MUTE_KEY = "scoop-runner-muted";
const BEST_KEY = "scoop-runner-best";
const STORIES_KEY = "scoop-runner-stories";

function formatScore(n: number) {
  return n.toLocaleString("en-US");
}

export function ScoopGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ScoopEngine | null>(null);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("title");
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [mine, setMine] = useState<number | null>(null);
  const [country, setCountry] = useState("UN");
  const [muted, setMuted] = useState(false);
  const [best, setBest] = useState(0);
  const [careerStories, setCareerStories] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
      setMuted(localStorage.getItem(MUTE_KEY) === "1");
      setBest(Number(localStorage.getItem(BEST_KEY) ?? "0") || 0);
      setCareerStories(Number(localStorage.getItem(STORIES_KEY) ?? "0") || 0);
    } catch {
      /* ignore */
    }
    const localCountry = guessCountryClient();
    if (localCountry) setCountry(localCountry);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = navigator.language;
    void detectCountry({ data: { timezone: tz, locale } })
      .then((r) => {
        if (r.countryCode && r.countryCode !== "UN") setCountry(r.countryCode);
      })
      .catch(() => {});
    void listScores()
      .then(setScores)
      .catch(() => {});
  }, []);

  const onHud = useCallback((h: HudSnapshot) => setHud({ ...h }), []);
  const onOver = useCallback((r: RunResult) => {
    setResult(r);
    setScreen("byline");
    setBest((prev) => {
      const next = Math.max(prev, r.score);
      try {
        localStorage.setItem(BEST_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    setCareerStories((prev) => {
      const next = prev + r.stories;
      try {
        localStorage.setItem(STORIES_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    setTimeout(() => nameRef.current?.focus(), 80);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new ScoopEngine(canvas, { onHud, onOver });
    engineRef.current = engine;
    setReady(true);
    void engine.boot();
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    const vis = () => {
      if (document.visibilityState === "visible") engine.setMuted(muted);
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      document.removeEventListener("visibilitychange", vis);
      engine.destroy();
      engineRef.current = null;
    };
  }, [onHud, onOver]);

  useEffect(() => {
    engineRef.current?.setMuted(muted);
  }, [muted, ready]);

  function play() {
    if (!engineRef.current || !ready) return;
    engineRef.current.setMuted(muted);
    engineRef.current.start();
    setScreen("playing");
    setError(null);
  }

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      engineRef.current?.setMuted(next);
      return next;
    });
  }

  async function fileScore(e: React.FormEvent) {
    e.preventDefault();
    if (!result) return;
    const byline = name.trim();
    if (byline.length < 2) {
      setError("Byline needs at least two characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem(NAME_KEY, byline);
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const posted = await submitScore({
        data: {
          name: byline,
          score: result.score,
          stories: result.stories,
          timezone: tz,
          locale: navigator.language,
        },
      });
      setScores(posted.scores);
      setMine(posted.id);
      setCountry(posted.countryCode);
      setScreen("board");
    } catch {
      setError("The wire is jammed. Try filing again.");
    } finally {
      setBusy(false);
    }
  }

  async function openBoard() {
    try {
      setScores(await listScores());
    } catch {
      /* ignore */
    }
    setScreen("board");
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-ink text-paper">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none select-none"
        style={{ touchAction: "none" }}
      />

      {screen === "playing" && hud && <Hud hud={hud} country={country} />}

      {screen === "playing" && (
        <TouchControls
          onJump={(v) => engineRef.current?.setJump(v)}
          onSlide={(v) => engineRef.current?.setSlide(v)}
        />
      )}

      <div className="pointer-events-none absolute top-3 right-3 z-20 flex gap-2 sm:top-4 sm:right-4">
        <IconBtn label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
          {muted ? <VolumeX /> : <Volume2 />}
        </IconBtn>
        {screen === "playing" && (
          <IconBtn
            label={hud?.paused ? "Resume" : "Pause"}
            onClick={() => engineRef.current?.pause()}
          >
            {hud?.paused ? <Play /> : <Pause />}
          </IconBtn>
        )}
      </div>

      {screen === "title" && (
        <TitleScreen
          ready={ready}
          best={best}
          stories={careerStories}
          country={country}
          onPlay={play}
          onBoard={openBoard}
        />
      )}

      {screen === "playing" && hud?.paused && (
        <PauseCard
          onResume={() => engineRef.current?.pause()}
          onQuit={() => {
            engineRef.current?.idlePreview();
            setScreen("title");
          }}
        />
      )}

      {screen === "byline" && result && (
        <BylineScreen
          result={result}
          name={name}
          setName={setName}
          error={error}
          busy={busy}
          best={best}
          inputRef={nameRef}
          onSubmit={fileScore}
        />
      )}

      {screen === "board" && (
        <ScoreboardScreen
          scores={scores}
          mine={mine}
          country={country}
          onPlay={play}
          onHome={() => {
            engineRef.current?.idlePreview();
            setScreen("title");
          }}
        />
      )}
    </main>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="pointer-events-auto flex size-11 items-center justify-center rounded-[12px] border border-paper/20 bg-ink/55 text-paper backdrop-blur-sm hover:border-paper/40"
    >
      {children}
    </button>
  );
}

function TitleScreen({
  ready,
  best,
  stories,
  country,
  onPlay,
  onBoard,
}: {
  ready: boolean;
  best: number;
  stories: number;
  country: string;
  onPlay: () => void;
  onBoard: () => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink/55 p-4 backdrop-blur-[2px]">
      <section className="w-full max-w-lg rounded-[24px] bg-paper p-5 text-ink shadow-[0_24px_60px_rgba(0,0,0,0.45)] sm:p-8">
        <p className="font-display text-[11px] tracking-[0.28em] text-masthead uppercase">The Daily Exclusive</p>
        <div className="mt-2 h-px bg-ink" />
        <h1 className="mt-3 font-display text-5xl leading-none tracking-tight text-ink sm:text-6xl">
          SCOOP
          <span className="block text-masthead">RUNNER</span>
        </h1>
        <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-muted">
          You are the city desk's last honest reporter. Sprint the skyline, grab the exclusive,
          and file it before the competition does.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 rounded-[16px] bg-paper-dim/80 p-3 text-center">
          <Stat k="Best file" v={formatScore(best)} />
          <Stat k="Stories" v={formatScore(stories)} />
          <Stat
            k="Desk"
            v={
              <span className="inline-flex items-center justify-center gap-1.5">
                {country !== "UN" && (
                  <img src={flagUrl(country, 40)} alt="" width={20} height={14} className="h-3.5 w-5 object-cover" />
                )}
                {country}
              </span>
            }
          />
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1" size="lg" onClick={onPlay} disabled={!ready}>
            {ready ? "Play" : "Setting type…"}
          </Button>
          <Button variant="ink" size="lg" className="sm:min-w-40" onClick={onBoard}>
            <Trophy className="size-4" />
            Scoreboard
          </Button>
        </div>
        <p className="mt-4 text-center text-xs leading-relaxed text-muted">
          Jump: Space / W / tap right · Slide: Down / S / tap left
        </p>
      </section>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="font-display text-[10px] tracking-[0.18em] text-muted uppercase">{k}</div>
      <div className="mt-1 font-display text-lg tabular-nums">{v}</div>
    </div>
  );
}

function Hud({ hud, country }: { hud: HudSnapshot; country: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-[16px] border border-paper/15 bg-ink/55 px-3 py-2 backdrop-blur-sm">
          <div className="font-display text-[10px] tracking-[0.2em] text-paper/60 uppercase">Score</div>
          <div className="font-display text-3xl leading-none tabular-nums">{formatScore(hud.score)}</div>
          <div className="mt-1 flex items-center gap-2 font-display text-[11px] tracking-wide text-paper/70 uppercase">
            <span>{hud.season}</span>
            <span className="text-paper/35">/</span>
            <span>{formatScore(hud.distanceM)} m</span>
          </div>
        </div>
        <div className="hidden rounded-[16px] border border-paper/15 bg-ink/55 px-3 py-2 backdrop-blur-sm sm:block">
          {country !== "UN" && (
            <img src={flagUrl(country, 40)} alt="" width={28} height={20} className="mx-auto h-5 w-7 object-cover" />
          )}
        </div>
      </div>
      <div className="mt-3 flex max-w-sm items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex justify-between font-display text-[10px] tracking-[0.16em] text-paper/70 uppercase">
            <span>Deadline</span>
            {hud.frontPage && <span className="text-masthead">Front page</span>}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink/60 ring-1 ring-paper/15">
            <div
              className={cn("h-full rounded-full", hud.frontPage ? "bg-masthead" : "bg-paper")}
              style={{ width: `${Math.round(hud.deadline * 100)}%` }}
            />
          </div>
        </div>
        <div className="rounded-[10px] bg-ink/60 px-2.5 py-1 font-display text-sm tabular-nums">
          x{hud.multiplier.toFixed(1)}
          {hud.combo > 1 && <span className="ml-1 text-paper/60">{hud.combo}</span>}
        </div>
      </div>
    </div>
  );
}

function TouchControls({
  onJump,
  onSlide,
}: {
  onJump: (v: boolean) => void;
  onSlide: (v: boolean) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-between gap-4 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
      <button
        type="button"
        className="pointer-events-auto flex h-16 min-w-28 flex-1 items-center justify-center gap-2 rounded-[16px] border border-paper/20 bg-ink/55 font-display tracking-wide uppercase backdrop-blur-sm"
        onPointerDown={(e) => {
          e.preventDefault();
          onSlide(true);
        }}
        onPointerUp={() => onSlide(false)}
        onPointerCancel={() => onSlide(false)}
        onPointerLeave={() => onSlide(false)}
      >
        <ChevronDown className="size-5" />
        Slide
      </button>
      <button
        type="button"
        className="pointer-events-auto flex h-16 min-w-28 flex-1 items-center justify-center rounded-[16px] bg-masthead font-display tracking-wide text-paper uppercase"
        onPointerDown={(e) => {
          e.preventDefault();
          onJump(true);
        }}
        onPointerUp={() => onJump(false)}
        onPointerCancel={() => onJump(false)}
        onPointerLeave={() => onJump(false)}
      >
        Jump
      </button>
    </div>
  );
}

function PauseCard({ onResume, onQuit }: { onResume: () => void; onQuit: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/60 p-4">
      <div className="w-full max-w-sm rounded-[24px] bg-paper p-6 text-ink">
        <h2 className="font-display text-3xl">Hold the presses</h2>
        <p className="mt-2 text-sm text-muted">The city keeps moving the second you resume.</p>
        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={onResume}>Resume</Button>
          <Button variant="ink" onClick={onQuit}>
            Desk
          </Button>
        </div>
      </div>
    </div>
  );
}

function BylineScreen({
  result,
  name,
  setName,
  error,
  busy,
  best,
  inputRef,
  onSubmit,
}: {
  result: RunResult;
  name: string;
  setName: (v: string) => void;
  error: string | null;
  busy: boolean;
  best: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/70 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-[24px] bg-paper p-6 text-ink shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
      >
        <p className="font-display text-[11px] tracking-[0.24em] text-masthead uppercase">Killed the story</p>
        <h2 className="mt-1 font-display text-4xl leading-none">File your byline</h2>
        <div className="mt-5 grid grid-cols-3 gap-2 rounded-[16px] bg-paper-dim p-3 text-center">
          <Stat k="Score" v={formatScore(result.score)} />
          <Stat k="Scoops" v={formatScore(result.stories)} />
          <Stat k="Run" v={`${formatScore(result.distanceM)} m`} />
        </div>
        {result.score >= best && (
          <p className="mt-3 font-display text-xs tracking-wide text-masthead uppercase">New desk record</p>
        )}
        <label className="mt-5 block font-display text-[11px] tracking-[0.16em] text-muted uppercase">
          Name
          <Input
            ref={inputRef}
            className="mt-2"
            value={name}
            maxLength={16}
            autoComplete="nickname"
            placeholder="City desk alias"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {error && <p className="mt-2 text-sm text-masthead">{error}</p>}
        <Button type="submit" className="mt-5 w-full" size="lg" disabled={busy}>
          {busy ? "Filing…" : "File to the global desk"}
        </Button>
      </form>
    </div>
  );
}

function ScoreboardScreen({
  scores,
  mine,
  country,
  onPlay,
  onHome,
}: {
  scores: ScoreRow[];
  mine: number | null;
  country: string;
  onPlay: () => void;
  onHome: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/75 p-3 sm:p-6">
      <section className="flex max-h-[min(720px,100dvh-1.5rem)] w-full max-w-xl flex-col rounded-[24px] bg-paper text-ink shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
        <header className="border-b border-ink/10 px-5 py-4 sm:px-6">
          <p className="font-display text-[11px] tracking-[0.24em] text-masthead uppercase">Worldwide desk</p>
          <h2 className="font-display text-3xl leading-none sm:text-4xl">Global Scoreboard</h2>
          <p className="mt-2 text-sm text-muted">Filed from the field, flagged by country.</p>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3">
          {scores.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">No scoops filed yet. Be the first on the front page.</p>
          ) : (
            <ol>
              {scores.map((row, i) => (
                <li
                  key={row.id}
                  className={cn(
                    "grid grid-cols-[2rem_1.75rem_1fr_auto] items-center gap-2 rounded-[12px] px-3 py-2.5",
                    mine === row.id ? "bg-masthead/10" : i % 2 === 0 ? "bg-transparent" : "bg-paper-dim/50",
                  )}
                >
                  <span className="font-display text-sm tabular-nums text-muted">{i + 1}</span>
                  <img
                    src={flagUrl(row.countryCode, 40)}
                    alt=""
                    width={28}
                    height={20}
                    className="h-5 w-7 rounded-[3px] object-cover ring-1 ring-ink/10"
                  />
                  <span className="truncate font-display text-[15px] tracking-wide">{row.playerName}</span>
                  <span className="font-display text-[15px] tabular-nums">{formatScore(row.score)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <footer className="flex flex-col gap-2 border-t border-ink/10 p-4 sm:flex-row">
          <Button className="flex-1" onClick={onPlay}>
            Run again
          </Button>
          <Button variant="ink" className="sm:min-w-32" onClick={onHome}>
            Desk
          </Button>
          {country !== "UN" && (
            <span className="hidden items-center gap-2 px-2 font-display text-xs tracking-wide text-muted uppercase sm:inline-flex">
              <img src={flagUrl(country, 40)} alt="" className="h-3.5 w-5 object-cover" />
              {country}
            </span>
          )}
        </footer>
      </section>
    </div>
  );
}
