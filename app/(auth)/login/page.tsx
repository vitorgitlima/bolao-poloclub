import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div className="min-h-screen stadium-bg flex items-center justify-center p-4">
      {/* Noise overlay */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo / Hero */}
        <div className="text-center mb-8">
          <div className="text-8xl mb-3 drop-shadow-2xl">⚽</div>
          <h1 className="text-5xl font-black mb-1 copa-gradient">
            Bolão Copa
          </h1>
          <p className="text-white/60 text-lg font-medium">
            Mundial 2026 · EUA, México & Canadá
          </p>
          <div className="flex justify-center items-center gap-3 mt-3 text-4xl">
            🇺🇸 🇲🇽 🇨🇦
          </div>
        </div>

        {/* Card de login */}
        <div className="glass rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-center text-white mb-1">
            Entre para jogar
          </h2>
          <p className="text-center text-white/40 text-sm mb-7">
            Faça palpites e dispute com seus amigos
          </p>

          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl font-semibold text-sm
                bg-white text-gray-800 hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl
                hover:-translate-y-0.5 active:translate-y-0"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar com Google
            </button>
          </form>

          {/* Regras rápidas */}
          <div className="mt-7 grid grid-cols-2 gap-2 text-center">
            {[
              { icon: "🎯", label: "Placar exato", pts: "6 pts", color: "text-green-400" },
              { icon: "⚖️", label: "Saldo de gols", pts: "4 pts", color: "text-purple-400" },
              { icon: "✅", label: "Vencedor certo", pts: "3 pts", color: "text-blue-400" },
              { icon: "⚡", label: "Double Points", pts: "×2", color: "text-yellow-400" },
            ].map((r) => (
              <div key={r.label} className="p-2.5 rounded-xl bg-white/5 border border-white/8">
                <div className="text-xl mb-1">{r.icon}</div>
                <div className="text-white/40 text-[10px] leading-tight mb-0.5">{r.label}</div>
                <div className={`font-bold text-sm ${r.color}`}>{r.pts}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          Bolão Copa do Mundo 2026 · Polo Club Oficial
        </p>
        <p className="text-center text-white/15 text-xs mt-1">
          Built by <span className="text-white/25 font-medium">SatoshiStandard</span>
        </p>
      </div>
    </div>
  );
}
