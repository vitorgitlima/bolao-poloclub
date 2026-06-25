"use client";

import Image from "next/image";
import { useRef, useLayoutEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  phase: string;
  externalId?: number | null;
};

// ── Layout constants (dimensões "naturais" — escalam via CSS) ──
const CARD_W = 180;
const CARD_H = 80;
const SLOT_H = 96;
const CON_W  = 40;
const COL_W  = CARD_W + CON_W;
const TOTAL_W = 4 * COL_W + CARD_W;
const TOTAL_H = 8 * SLOT_H;
const HEADER_H = 24;

function yCenter(round: number, idx: number) {
  if (round === 0) return (idx + 0.5) * SLOT_H;
  if (round === 1) return (idx * 2 + 1) * SLOT_H;
  if (round === 2) return (idx * 4 + 2) * SLOT_H;
  return 4 * SLOT_H;
}
function xLeft(round: number) {
  return round * COL_W;
}

// ── Sub-componentes ───────────────────────────────────────────
function TeamFlag({ src, alt }: { src: string; alt: string }) {
  if (src?.startsWith("http")) {
    return <Image src={src} alt={alt} width={18} height={18} className="object-contain shrink-0" unoptimized />;
  }
  return <span className="text-sm leading-none shrink-0">{src || "⚽"}</span>;
}

function BracketCard({ match }: { match: Match | null }) {
  if (!match) {
    return (
      <div
        style={{ height: CARD_H, width: CARD_W }}
        className="rounded-xl border border-white/8 bg-white/3 flex items-center justify-center"
      >
        <span className="text-white/20 text-xs font-medium">A definir</span>
      </div>
    );
  }

  const isLive     = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";
  const h = match.homeScore ?? null;
  const a = match.awayScore ?? null;
  const homeWon = isFinished && h !== null && a !== null && h > a;
  const awayWon = isFinished && h !== null && a !== null && a > h;

  const Row = ({ team, flag, score, won }: { team: string; flag: string; score: number | null; won: boolean }) => (
    <div className={cn("flex items-center gap-2 px-2.5", isFinished && !won ? "opacity-35" : "opacity-100")}>
      <TeamFlag src={flag} alt={team} />
      <span className={cn(
        "text-xs flex-1 truncate",
        won ? "text-white font-bold" : "text-white/75 font-medium",
        team === "A Definir" && "text-white/25",
      )}>
        {team === "A Definir" ? "A definir" : team}
      </span>
      {score !== null && match.status !== "SCHEDULED" && (
        <span className={cn("text-sm font-black tabular-nums shrink-0", won ? "text-green-400" : "text-white/35")}>
          {score}
        </span>
      )}
    </div>
  );

  return (
    <div
      style={{ height: CARD_H, width: CARD_W }}
      className={cn(
        "rounded-xl border flex flex-col justify-around",
        isLive ? "border-red-400/50 bg-red-500/5" : "border-white/12 bg-white/5",
      )}
    >
      <Row team={match.homeTeam} flag={match.homeFlag} score={match.homeScore} won={homeWon} />
      <div className="mx-2 h-px bg-white/8" />
      <Row team={match.awayTeam} flag={match.awayFlag} score={match.awayScore} won={awayWon} />
      {isLive && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
    </div>
  );
}

const LINE = "rgba(255,255,255,0.12)";

function Connectors({ fromRound, count }: { fromRound: number; count: number }) {
  const els: React.ReactElement[] = [];
  for (let i = 0; i < count; i += 2) {
    const y1   = yCenter(fromRound, i);
    const y2   = yCenter(fromRound, i + 1);
    const yMid = (y1 + y2) / 2;
    const toY  = yCenter(fromRound + 1, Math.floor(i / 2));
    const fromX = xLeft(fromRound) + CARD_W;
    const vX    = fromX + 14;
    const toX   = xLeft(fromRound + 1);
    els.push(
      <g key={`c${fromRound}-${i}`}>
        <line x1={fromX} y1={y1} x2={vX}  y2={y1}   stroke={LINE} strokeWidth={1.5} />
        <line x1={fromX} y1={y2} x2={vX}  y2={y2}   stroke={LINE} strokeWidth={1.5} />
        <line x1={vX}   y1={y1} x2={vX}  y2={y2}   stroke={LINE} strokeWidth={1.5} />
        <line x1={vX}   y1={yMid} x2={toX} y2={toY} stroke={LINE} strokeWidth={1.5} />
      </g>,
    );
  }
  return <>{els}</>;
}

// ── Componente principal ──────────────────────────────────────
const PHASES = [
  { key: "Oitavas de Final", round: 0, count: 8 },
  { key: "Quartas de Final", round: 1, count: 4 },
  { key: "Semifinal",        round: 2, count: 2 },
  { key: "Final",            round: 3, count: 1 },
];
const LABELS = ["Oitavas", "Quartas", "Semi", "Final"];

export function BracketView({ matches }: { matches: Match[] }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Mede a largura disponível e calcula o fator de escala (≤ 1)
  useLayoutEffect(() => {
    function measure() {
      if (!wrapperRef.current) return;
      const available = wrapperRef.current.offsetWidth;
      setScale(Math.min(1, available / TOTAL_W));
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  const byPhase = (phase: string) =>
    matches.filter((m) => m.phase === phase).sort((a, b) => (a.externalId ?? 0) - (b.externalId ?? 0));

  const games: (Match | null)[][] = PHASES.map((p) => {
    const found = byPhase(p.key);
    const filled: (Match | null)[] = [...found];
    while (filled.length < p.count) filled.push(null);
    return filled;
  });

  const terceiro = matches.find((m) => m.phase === "Disputa do 3º Lugar") ?? null;
  const finalY   = yCenter(3, 0);
  const innerH   = TOTAL_H + (terceiro ? 90 : 10);

  // Altura do container externo = conteúdo escalado
  const outerH = Math.ceil((HEADER_H + innerH) * scale);

  return (
    // Wrapper mede a largura disponível; sem overflow-x, sem scroll
    <div ref={wrapperRef} style={{ width: "100%", height: outerH, position: "relative" }}>
      {/* Conteúdo escalado — posicionado absolute para não influenciar o layout externo */}
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: TOTAL_W,
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {/* Cabeçalhos */}
        <div style={{ height: HEADER_H }} className="flex items-center">
          {LABELS.map((label, i) => (
            <div key={label} style={{ width: i < 3 ? COL_W : CARD_W }} className="text-center">
              <span className="text-[11px] text-white/35 font-bold uppercase tracking-widest">{label}</span>
            </div>
          ))}
        </div>

        {/* Bracket */}
        <div style={{ width: TOTAL_W, height: innerH }} className="relative">
          <svg
            style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
            width={TOTAL_W}
            height={innerH}
          >
            <Connectors fromRound={0} count={Math.max(games[0].length, 8)} />
            <Connectors fromRound={1} count={Math.max(games[1].length, 4)} />
            <Connectors fromRound={2} count={Math.max(games[2].length, 2)} />
          </svg>

          {/* Cards */}
          {PHASES.map((p) =>
            games[p.round].map((match, idx) => (
              <div
                key={match?.id ?? `${p.key}-${idx}`}
                style={{ position: "absolute", left: xLeft(p.round), top: yCenter(p.round, idx) - CARD_H / 2 }}
              >
                <BracketCard match={match} />
              </div>
            )),
          )}

          {/* Label FINAL */}
          <div
            style={{ position: "absolute", left: xLeft(3), top: finalY - CARD_H / 2 - 18, width: CARD_W }}
            className="text-center text-[10px] text-yellow-400/70 font-bold tracking-wider"
          >
            🏆 FINAL
          </div>

          {/* 3º Lugar */}
          {terceiro && (
            <div style={{ position: "absolute", left: xLeft(3), top: finalY + CARD_H / 2 + 16 }}>
              <div className="text-center text-[10px] text-white/25 font-bold tracking-wider mb-1">3º LUGAR</div>
              <BracketCard match={terceiro} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
