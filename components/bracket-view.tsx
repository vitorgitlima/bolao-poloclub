"use client";

import Image from "next/image";
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

// ── Layout constants ──────────────────────────────────────────
const CARD_W = 180;
const CARD_H = 80;
const SLOT_H = 96; // slot por jogo das oitavas (inclui gap)
const CON_W = 40; // largura do conector horizontal
const COL_W = CARD_W + CON_W; // largura total de cada coluna
const TOTAL_H = 8 * SLOT_H;
const TOTAL_W = 4 * COL_W + CARD_W; // 4 conectores + 5 colunas de card

function yCenter(round: number, idx: number) {
  if (round === 0) return (idx + 0.5) * SLOT_H;
  if (round === 1) return (idx * 2 + 1) * SLOT_H;
  if (round === 2) return (idx * 4 + 2) * SLOT_H;
  return 4 * SLOT_H; // Final
}
function xLeft(round: number) {
  return round * COL_W;
}

// ── Componentes internos ──────────────────────────────────────
function TeamFlag({ src, alt }: { src: string; alt: string }) {
  if (src?.startsWith("http")) {
    return (
      <Image src={src} alt={alt} width={18} height={18} className="object-contain shrink-0" unoptimized />
    );
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

  const isLive = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";
  const h = match.homeScore ?? null;
  const a = match.awayScore ?? null;
  const homeWon = isFinished && h !== null && a !== null && h > a;
  const awayWon = isFinished && h !== null && a !== null && a > h;

  const Row = ({
    team, flag, score, won,
  }: { team: string; flag: string; score: number | null; won: boolean }) => (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5",
        isFinished && !won ? "opacity-35" : "opacity-100",
      )}
    >
      <TeamFlag src={flag} alt={team} />
      <span
        className={cn(
          "text-xs flex-1 truncate",
          won ? "text-white font-bold" : "text-white/75 font-medium",
          team === "A Definir" && "text-white/25",
        )}
      >
        {team === "A Definir" ? "A definir" : team}
      </span>
      {score !== null && !["SCHEDULED"].includes(match.status) && (
        <span
          className={cn(
            "text-sm font-black tabular-nums shrink-0",
            won ? "text-green-400" : "text-white/35",
          )}
        >
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
        isLive
          ? "border-red-400/50 bg-red-500/5"
          : "border-white/12 bg-white/5",
      )}
    >
      <Row team={match.homeTeam} flag={match.homeFlag} score={match.homeScore} won={homeWon} />
      <div className="mx-2 h-px bg-white/8" />
      <Row team={match.awayTeam} flag={match.awayFlag} score={match.awayScore} won={awayWon} />
      {isLive && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-400 animate-pulse" />
      )}
    </div>
  );
}

// ── SVG connectors ────────────────────────────────────────────
const LINE = "rgba(255,255,255,0.12)";

function Connectors({
  fromRound,
  count,
}: {
  fromRound: number;
  count: number;
}) {
  const elements: React.ReactElement[] = [];

  for (let i = 0; i < count; i += 2) {
    const y1 = yCenter(fromRound, i);
    const y2 = yCenter(fromRound, i + 1);
    const yMid = (y1 + y2) / 2;
    const toY = yCenter(fromRound + 1, Math.floor(i / 2));
    const fromX = xLeft(fromRound) + CARD_W;
    const vX = fromX + 14;
    const toX = xLeft(fromRound + 1);

    elements.push(
      <g key={`c${fromRound}-${i}`}>
        <line x1={fromX} y1={y1} x2={vX} y2={y1} stroke={LINE} strokeWidth={1.5} />
        <line x1={fromX} y1={y2} x2={vX} y2={y2} stroke={LINE} strokeWidth={1.5} />
        <line x1={vX} y1={y1} x2={vX} y2={y2} stroke={LINE} strokeWidth={1.5} />
        <line x1={vX} y1={yMid} x2={toX} y2={toY} stroke={LINE} strokeWidth={1.5} />
      </g>,
    );
  }
  return <>{elements}</>;
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
  const byPhase = (phase: string) =>
    matches
      .filter((m) => m.phase === phase)
      .sort((a, b) => (a.externalId ?? 0) - (b.externalId ?? 0));

  const games: (Match | null)[][] = PHASES.map((p) => {
    const found = byPhase(p.key);
    const filled: (Match | null)[] = [...found];
    while (filled.length < p.count) filled.push(null);
    return filled;
  });

  const terceiro = matches.find((m) => m.phase === "Disputa do 3º Lugar") ?? null;
  const finalY = yCenter(3, 0);

  return (
    <div className="overflow-x-auto pb-4 -mx-4 px-4">
      {/* Cabeçalhos das rodadas */}
      <div
        style={{ width: TOTAL_W, paddingBottom: 6 }}
        className="flex"
      >
        {LABELS.map((label, i) => (
          <div key={label} style={{ width: i < 3 ? COL_W : CARD_W }} className="text-center">
            <span className="text-[11px] text-white/35 font-bold uppercase tracking-widest">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Bracket */}
      <div style={{ width: TOTAL_W, height: TOTAL_H + (terceiro ? 90 : 10) }} className="relative">
        {/* SVG lines */}
        <svg
          style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
          width={TOTAL_W}
          height={TOTAL_H + 10}
        >
          <Connectors fromRound={0} count={Math.max(games[0].length, 8)} />
          <Connectors fromRound={1} count={Math.max(games[1].length, 4)} />
          <Connectors fromRound={2} count={Math.max(games[2].length, 2)} />
        </svg>

        {/* Cards de cada rodada */}
        {PHASES.map((p) =>
          games[p.round].map((match, idx) => (
            <div
              key={match?.id ?? `${p.key}-${idx}`}
              style={{
                position: "absolute",
                left: xLeft(p.round),
                top: yCenter(p.round, idx) - CARD_H / 2,
              }}
            >
              <BracketCard match={match} />
            </div>
          )),
        )}

        {/* Label da Final sobre o card */}
        <div
          style={{
            position: "absolute",
            left: xLeft(3),
            top: finalY - CARD_H / 2 - 18,
            width: CARD_W,
          }}
          className="text-center text-[10px] text-yellow-400/70 font-bold tracking-wider"
        >
          🏆 FINAL
        </div>

        {/* Disputa 3º Lugar (abaixo da Final) */}
        {terceiro && (
          <div
            style={{
              position: "absolute",
              left: xLeft(3),
              top: finalY + CARD_H / 2 + 16,
            }}
          >
            <div className="text-center text-[10px] text-white/25 font-bold tracking-wider mb-1">
              3º LUGAR
            </div>
            <BracketCard match={terceiro} />
          </div>
        )}
      </div>
    </div>
  );
}
