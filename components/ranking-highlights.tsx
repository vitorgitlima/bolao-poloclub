type Highlights = {
  roundName: string;
  craque: { name: string | null; points: number } | null;
  reiExatos: { name: string | null; count: number } | null;
  maiorSubida: { name: string | null; positions: number } | null;
  bolaMurcha: Array<string | null> | null;
};

function rodadaLabel(phase: string): string {
  return phase.replace(/^🧪\s*/, "").replace(/\s*\(teste\)\s*/i, "");
}

function Card({
  icon,
  title,
  name,
  stat,
}: {
  icon: string;
  title: string;
  name: string | null;
  stat: string;
}) {
  return (
    <div className="bg-white/8 backdrop-blur-sm rounded-xl p-3 flex items-start gap-2.5 border border-white/15">
      <span className="text-xl leading-none shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-white/35 text-[10px] uppercase tracking-wider font-semibold leading-none mb-1">
          {title}
        </p>
        <p className="text-white font-bold text-sm truncate">{name ?? "—"}</p>
        <p className="text-white/40 text-xs mt-0.5">{stat}</p>
      </div>
    </div>
  );
}

export function RankingHighlights({ highlights }: { highlights: Highlights }) {
  const { craque, reiExatos, maiorSubida, bolaMurcha } = highlights;

  const hasSomething = craque || reiExatos || maiorSubida || bolaMurcha;
  if (!hasSomething) return null;

  const bolaNomes = bolaMurcha?.filter(Boolean).join(" e ") ?? null;

  return (
    <div className="space-y-2">
      <p className="text-white/30 text-xs uppercase tracking-wider font-semibold px-1">
        Destaques — {rodadaLabel(highlights.roundName)}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {craque && (
          <Card
            icon="👑"
            title="Craque da Rodada"
            name={craque.name}
            stat={`${craque.points} pts na rodada`}
          />
        )}
        {reiExatos && (
          <Card
            icon="🎯"
            title="Rei dos Exatos"
            name={reiExatos.name}
            stat={`${reiExatos.count} placar${reiExatos.count !== 1 ? "es" : ""} exato${reiExatos.count !== 1 ? "s" : ""}`}
          />
        )}
        {maiorSubida && (
          <Card
            icon="📈"
            title="Maior Subida"
            name={maiorSubida.name}
            stat={`+${maiorSubida.positions} posição${maiorSubida.positions !== 1 ? "s" : ""}`}
          />
        )}
        {bolaNomes && (
          <Card
            icon="🤡"
            title="Bola Murcha"
            name={bolaNomes}
            stat="0 pts na rodada"
          />
        )}
      </div>
    </div>
  );
}
