"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type EventDetail = {
  minute: string;
  side: "home" | "away";
  type: "goal" | "yellow" | "red";
  playerName: string;
  ownGoal: boolean;
  penalty: boolean;
};

type LiveDetails = {
  id: string;
  displayClock: string;
  period: number;
  homeCards: { yellow: number; red: number };
  awayCards: { yellow: number; red: number };
  homePossession: number;
  awayPossession: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  events: EventDetail[];
};

const POLL_MS = 60_000;

function CardPip({ color }: { color: "yellow" | "red" }) {
  return (
    <span
      className={cn(
        "inline-block w-[7px] h-[9px] rounded-[1px]",
        color === "yellow" ? "bg-yellow-400" : "bg-red-500"
      )}
    />
  );
}

function lastName(fullName: string) {
  if (!fullName) return "";
  const parts = fullName.trim().split(" ");
  return parts[parts.length - 1];
}

export function LiveMatchBar({
  externalId,
  status,
}: {
  externalId: number | null;
  status: string;
}) {
  const [details, setDetails] = useState<LiveDetails | null>(null);

  const isActive =
    status === "LIVE" || status === "EXTRA_TIME" || status === "PENALTIES";

  useEffect(() => {
    if (!isActive || !externalId) return;

    async function load() {
      try {
        const res = await fetch("/api/matches/live-details");
        if (!res.ok) return;
        const data = await res.json();
        const match = (data.details as LiveDetails[]).find(
          (d) => d.id === String(externalId)
        );
        setDetails(match ?? null);
      } catch {}
    }

    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [externalId, isActive]);

  if (!isActive || !externalId || !details) return null;

  const homeGoals = details.events.filter(
    (e) => e.side === "home" && e.type === "goal"
  );
  const awayGoals = details.events.filter(
    (e) => e.side === "away" && e.type === "goal"
  );
  const hasGoals = homeGoals.length > 0 || awayGoals.length > 0;
  const hasHomeCards =
    details.homeCards.yellow > 0 || details.homeCards.red > 0;
  const hasAwayCards =
    details.awayCards.yellow > 0 || details.awayCards.red > 0;
  const hasCards = hasHomeCards || hasAwayCards;
  const hasPossession = details.homePossession > 0;
  const hasShotsOnTarget =
    details.homeShotsOnTarget > 0 || details.awayShotsOnTarget > 0;

  const periodLabel =
    details.period === 1
      ? "1°T"
      : details.period === 2
        ? "2°T"
        : details.period >= 3
          ? "Prorrg."
          : "";

  const clockColor =
    status === "EXTRA_TIME"
      ? "text-orange-400"
      : status === "PENALTIES"
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="border-t border-white/8 pt-2.5 mt-1 space-y-2">
      {/* Relógio + período */}
      {status !== "PENALTIES" && details.displayClock && (
        <div className="flex items-center justify-center gap-2">
          <span className={cn("text-xs font-bold tabular-nums", clockColor)}>
            ⏱ {details.displayClock}
          </span>
          {periodLabel && (
            <span className="text-white/25 text-[10px]">{periodLabel}</span>
          )}
        </div>
      )}

      {/* Gols */}
      {hasGoals && (
        <div className="flex items-start justify-between gap-3 px-0.5 text-[10px]">
          {/* Home goals */}
          <div className="flex-1 space-y-0.5">
            {homeGoals.map((e, i) => (
              <div key={i} className="flex items-center gap-1 text-white/55">
                <span>⚽</span>
                <span className="font-medium">{lastName(e.playerName)}</span>
                <span className="text-white/25">{e.minute}</span>
                {e.ownGoal && <span className="text-red-400/50">(og)</span>}
                {e.penalty && <span className="text-white/25">(p)</span>}
              </div>
            ))}
          </div>

          {/* Away goals */}
          <div className="flex-1 space-y-0.5 text-right">
            {awayGoals.map((e, i) => (
              <div key={i} className="flex items-center justify-end gap-1 text-white/55">
                {e.ownGoal && <span className="text-red-400/50">(og)</span>}
                {e.penalty && <span className="text-white/25">(p)</span>}
                <span className="text-white/25">{e.minute}</span>
                <span className="font-medium">{lastName(e.playerName)}</span>
                <span>⚽</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cartões */}
      {hasCards && (
        <div className="flex items-center justify-between px-0.5">
          {/* Home cards */}
          <div className="flex items-center gap-1">
            {Array.from({ length: details.homeCards.yellow }).map((_, i) => (
              <CardPip key={`hy${i}`} color="yellow" />
            ))}
            {Array.from({ length: details.homeCards.red }).map((_, i) => (
              <CardPip key={`hr${i}`} color="red" />
            ))}
          </div>

          {/* Away cards */}
          <div className="flex items-center gap-1">
            {Array.from({ length: details.awayCards.yellow }).map((_, i) => (
              <CardPip key={`ay${i}`} color="yellow" />
            ))}
            {Array.from({ length: details.awayCards.red }).map((_, i) => (
              <CardPip key={`ar${i}`} color="red" />
            ))}
          </div>
        </div>
      )}

      {/* Posse + chutes no gol */}
      {(hasPossession || hasShotsOnTarget) && (
        <div className="space-y-1 px-0.5">
          {hasPossession && (
            <div>
              <div className="flex justify-between text-[9px] text-white/25 mb-0.5">
                <span>{Math.round(details.homePossession)}%</span>
                <span>posse</span>
                <span>{Math.round(details.awayPossession)}%</span>
              </div>
              <div className="h-[3px] rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full bg-green-400/40 rounded-full"
                  style={{ width: `${details.homePossession}%` }}
                />
              </div>
            </div>
          )}
          {hasShotsOnTarget && (
            <div className="flex justify-between text-[9px] text-white/25">
              <span>{details.homeShotsOnTarget}</span>
              <span>chutes no gol</span>
              <span>{details.awayShotsOnTarget}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
