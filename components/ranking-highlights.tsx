type Highlights = {
  roundName: string;
  craque: { names: string[]; points: number } | null;
  reiExatos: { names: string[]; count: number } | null;
  maiorSubida: { names: string[]; positions: number } | null;
  bolaMurcha: Array<string | null> | null;
};

function rodadaLabel(phase: string): string {
  return phase.replace(/^🧪\s*/, "").replace(/\s*\(teste\)\s*/i, "");
}

function Card({
  icon,
  title,
  names,
  stat,
}: {
  icon: string;
  title: string;
  names: string[];
  stat: string;
}) {
  return (
    <div className="bg-white/8 backdrop-blur-sm rounded-xl p-3 flex items-start gap-2.5 border border-white/15">
      <span className="text-xl leading-none shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0 w-full">
        <p className="text-white/35 text-[10px] uppercase tracking-wider font-semibold leading-none mb-1">
          {title}
        </p>
        <div className="space-y-0.5">
          {names.map((name, i) => (
            <p key={i} className="text-white font-bold text-sm leading-snug">
              {name}
            </p>
          ))}
        </div>
        <p className="text-white/40 text-xs mt-1">{stat}</p>
      </div>
    </div>
  );
}

export function RankingHighlights({ highlights }: { highlights: Highlights }) {
  const { craque, reiExatos, maiorSubida, bolaMurcha } = highlights;

  const hasSomething = craque || reiExatos || maiorSubida || bolaMurcha;
  if (!hasSomething) return null;

  const bolaNomes = (bolaMurcha?.filter(Boolean) as string[]) ?? [];

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
            names={craque.names}
            stat={`${craque.points} pts na rodada`}
          />
        )}
        {reiExatos && (
          <Card
            icon="🎯"
            title="Rei dos Exatos"
            names={reiExatos.names}
            stat={`${reiExatos.count} placar${reiExatos.count !== 1 ? "es" : ""} exato${reiExatos.count !== 1 ? "s" : ""}`}
          />
        )}
        {maiorSubida && (
          <Card
            icon="🚀"
            title="Maior Subida"
            names={maiorSubida.names}
            stat={`+${maiorSubida.positions} posição${maiorSubida.positions !== 1 ? "s" : ""}`}
          />
        )}
        {bolaNomes.length > 0 && (
          <Card
            icon="🤡"
            title="Bola Murcha"
            names={bolaNomes}
            stat="0 pts na rodada"
          />
        )}
      </div>
    </div>
  );
}
