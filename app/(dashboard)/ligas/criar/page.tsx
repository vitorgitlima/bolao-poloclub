"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Loader2 } from "lucide-react";

const MAX_DESCRIPTION = 280;

export default function CriarLigaPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao criar liga"); return; }
      router.push(`/ligas/${data.id}`);
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md w-full mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/ligas" className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white">Criar Liga</h1>
          <p className="text-white/40 text-sm">Configure sua liga privada</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/15 flex items-center justify-center">
            <Users className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div>
          <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
            Nome da Liga
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Liga do Escritório"
            maxLength={50}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-blue-400/50 text-sm"
            autoFocus
          />
          <p className="text-white/25 text-xs mt-1.5 text-right">{name.length}/50</p>
        </div>

        <div>
          <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
            Descrição <span className="normal-case text-white/30 font-normal">(opcional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Grupo do zap: wa.me/... · Prêmio: R$50 por rodada"
            maxLength={MAX_DESCRIPTION}
            rows={3}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-blue-400/50 text-sm resize-none leading-relaxed"
          />
          <p className={`text-xs mt-1.5 text-right ${description.length > MAX_DESCRIPTION * 0.9 ? "text-yellow-400/60" : "text-white/25"}`}>
            {description.length}/{MAX_DESCRIPTION}
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">{error}</p>
        )}

        <div className="space-y-2 text-xs text-white/35 bg-white/3 rounded-xl p-3">
          <p>✓ Até 50 participantes por liga</p>
          <p>✓ Link de convite para convidar amigos</p>
          <p>✓ Ranking exclusivo da liga</p>
          <p>✓ Você pode criar até 5 ligas</p>
        </div>

        <button
          type="submit"
          disabled={loading || name.trim().length < 2}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-sm"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</> : "Criar Liga"}
        </button>
      </form>
    </div>
  );
}
