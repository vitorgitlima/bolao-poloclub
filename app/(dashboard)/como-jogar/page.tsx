import { Trophy, Zap, Target, Star, Lock, Users } from "lucide-react";

export default function ComoJogarPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          Comece por Aqui
          <span className="text-xs font-bold bg-green-400/20 text-green-300 border border-green-400/30 px-2 py-0.5 rounded-full">
            GUIA
          </span>
        </h1>
        <p className="text-white/40 text-sm mt-0.5">
          Tudo que você precisa saber para jogar o Bolão da Copa
        </p>
      </div>

      {/* O que é */}
      <div className="glass-card p-5 space-y-2">
        <h2 className="text-white font-bold text-base flex items-center gap-2">
          <span className="text-xl">⚽</span> O que é o Bolão da Copa?
        </h2>
        <p className="text-white/60 text-sm leading-relaxed">
          O <strong className="text-white/90">Bolão da Copa</strong> é um jogo de palpites entre amigos do PoloClub para a{" "}
          <strong className="text-white/90">Copa do Mundo 2026</strong>. Você prevê o placar de cada jogo, acumula pontos e
          disputa o ranking com todos os participantes.
        </p>
        <div className="mt-3 p-3 rounded-xl bg-yellow-400/5 border border-yellow-400/20">
          <p className="text-yellow-300/80 text-xs flex items-start gap-2">
            <span className="text-base leading-none">🧪</span>
            <span>
              <strong className="text-yellow-300">Modo Beta ativo —</strong> enquanto a Copa 2026 não começa,
              estamos testando o sistema com jogos do{" "}
              <strong className="text-yellow-300">Brasileirão Série A</strong>. Os palpites aqui não contam para
              o ranking oficial da Copa!
            </span>
          </p>
        </div>
      </div>

      {/* Como fazer palpites */}
      <div className="glass-card p-5 space-y-3">
        <h2 className="text-white font-bold text-base flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-400" /> Como fazer palpites
        </h2>
        <ol className="space-y-2 text-sm text-white/60">
          <li className="flex gap-3">
            <span className="text-white/30 font-bold shrink-0">1.</span>
            <span>Vá na aba <strong className="text-white/90">Série A (Beta)</strong> ou, futuramente, em <strong className="text-white/90">Jogos</strong> na Copa 2026.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-white/30 font-bold shrink-0">2.</span>
            <span>Digite o placar que você prevê para cada jogo nos campos de entrada.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-white/30 font-bold shrink-0">3.</span>
            <span>
              Opcionalmente, ative o <strong className="text-white/90">⚡ Double Points</strong> em um jogo por fase para dobrar seus pontos.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-white/30 font-bold shrink-0">4.</span>
            <span>Clique em <strong className="text-white/90">Salvar</strong> individualmente ou use o botão <strong className="text-white/90">Salvar Todos</strong> que aparece na parte de baixo da tela.</span>
          </li>
        </ol>
        <div className="flex items-center gap-2 mt-1 text-xs text-white/30 border-t border-white/5 pt-3">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>Os palpites fecham <strong className="text-white/50">10 minutos antes</strong> do início de cada jogo.</span>
        </div>
      </div>

      {/* Pontuação */}
      <div className="glass-card p-5 space-y-3">
        <h2 className="text-white font-bold text-base flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400" /> Sistema de pontuação
        </h2>
        <div className="space-y-2">
          {[
            { emoji: "🎯", label: "Placar exato", pts: "6 pts", desc: "Você acertou o placar certinho" },
            { emoji: "⚖️", label: "Saldo de gols certo", pts: "4 pts", desc: "O saldo (ex: +2) foi igual, mas o placar diferiu" },
            { emoji: "✅", label: "Vencedor certo", pts: "3 pts", desc: "Acertou quem ganhou ou que empatou" },
            { emoji: "❌", label: "Errou", pts: "0 pts", desc: "Resultado diferente do previsto" },
          ].map((row) => (
            <div key={row.label} className="flex items-start gap-3 text-sm">
              <span className="text-base leading-none shrink-0">{row.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="text-white/80 font-semibold">{row.label}</span>
                <span className="text-white/35 ml-2 text-xs">{row.desc}</span>
              </div>
              <span className="text-yellow-300 font-black shrink-0">{row.pts}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-white/5 pt-3 flex items-start gap-3 text-sm">
          <Zap className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-white/80 font-semibold">Double Points ⚡</span>
            <p className="text-white/35 text-xs mt-0.5">
              Você pode ativar o double em <strong className="text-white/60">1 jogo por fase</strong>. Os pontos ganhos naquele jogo são dobrados.
              Use com sabedoria — uma vez por fase, sem volta!
            </p>
          </div>
        </div>
      </div>

      {/* Ranking */}
      <div className="glass-card p-5 space-y-2">
        <h2 className="text-white font-bold text-base flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" /> Ranking
        </h2>
        <p className="text-white/60 text-sm leading-relaxed">
          O ranking geral mostra todos os participantes ordenados por pontuação total. Ele atualiza em tempo real
          a cada 30 segundos. Fique de olho — qualquer rodada pode virar o jogo!
        </p>
      </div>

      {/* Em breve */}
      <div className="glass-card p-5 space-y-2">
        <h2 className="text-white font-bold text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" /> Em breve
        </h2>
        <ul className="space-y-1.5 text-sm text-white/50">
          {[
            "Ligas privadas — crie seu próprio grupo",
            "Palpites para todos os jogos da Copa 2026",
            "Histórico detalhado por rodada",
            "Notificações de jogos e resultados",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-purple-400/60 mt-0.5">›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-white/20 text-xs pt-2 pb-4">
        Dúvidas? Fala com o Vitor no grupo do WhatsApp 😄
      </p>
    </div>
  );
}
