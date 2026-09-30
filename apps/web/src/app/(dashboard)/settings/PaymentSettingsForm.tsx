"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Building2, Save, Key, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";

export function PaymentSettingsForm({ restaurantId }: { restaurantId: string }) {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [bankName, setBankName] = useState("Banco Económico");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("restaurant_payment_integrations")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .then(({ data }) => {
        if (data) setIntegrations(data);
      });
  }, [restaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Basic upsert or insert logic
      const existing = integrations.find(i => i.bank_name === bankName);
      
      const payload = {
        restaurant_id: restaurantId,
        bank_name: bankName,
        client_id: clientId.trim(),
        // In a real app, this should be sent to a backend API to be encrypted before saving
        client_secret: clientSecret.trim(),
        is_active: true
      };

      if (existing) {
        const { error: updErr } = await supabase
          .from("restaurant_payment_integrations")
          .update(payload)
          .eq("id", existing.id);
        if (updErr) throw updErr;
      } else {
        const { data, error: insErr } = await supabase
          .from("restaurant_payment_integrations")
          .insert(payload)
          .select();
        if (insErr) throw insErr;
        if (data) setIntegrations([...integrations, data[0]]);
      }

      setSuccess("Credenciales guardadas correctamente.");
      setClientId("");
      setClientSecret("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al guardar integraciones.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm mt-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#1F2933] flex items-center gap-2">
          <ShieldCheck className="text-[#E76F51]" />
          Integración Bancaria (Cobros por QR)
        </h2>
        <p className="text-[#6B7280] text-sm mt-1">
          Configura tus credenciales API de tu banco para generar QRs de cobro directo a tu cuenta. 
          Al habilitar esta opción, el dinero de los pedidos se abonará sin intermediarios.
        </p>
      </div>

      {success && (
        <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 size={20} />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-semibold text-[#1F2933]">Bancos Conectados</h3>
          {integrations.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Ningún banco configurado aún.</p>
          ) : (
            integrations.map(int => (
              <div key={int.id} className="border border-green-200 bg-green-50 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-green-800">{int.bank_name}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <CheckCircle2 size={12} /> Conectado y Activo
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
                <Building2 size={14} className="text-[#6B7280]" />
                Banco
              </label>
              <select
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors bg-white"
              >
                <option value="Banco Económico">Banco Económico</option>
                <option value="Banco Bisa">Banco Bisa</option>
                <option value="Banco BNB">Banco Nacional de Bolivia (BNB)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
                  <Key size={14} className="text-[#6B7280]" />
                  Client ID
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  placeholder="Tu Client ID"
                  className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
                  <Key size={14} className="text-[#6B7280]" />
                  Client Secret
                </label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={e => setClientSecret(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !clientId || !clientSecret}
                className="flex items-center gap-2 bg-[#1F2933] text-white rounded-xl px-6 py-3 font-medium hover:bg-black transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {loading ? "Guardando..." : "Guardar Credenciales"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
