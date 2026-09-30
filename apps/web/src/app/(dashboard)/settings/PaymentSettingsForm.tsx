"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Building2, Save, CheckCircle2, ShieldCheck, AlertCircle, Wallet } from "lucide-react";

export function PaymentSettingsForm({ restaurantId }: { restaurantId: string }) {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [accountNumber, setAccountNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("restaurant_payment_integrations")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setIntegrations(data);
          setAccountNumber(data[0].account_number || "");
        }
      });
  }, [restaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const existing = integrations.find(i => i.bank_name === "Banco Económico");
      
      const payload = {
        restaurant_id: restaurantId,
        bank_name: "Banco Económico",
        account_number: accountNumber.trim(),
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

      setSuccess("Cuenta guardada correctamente. Los cobros por QR se abonarán a esta cuenta.");
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
          Cobros con QR Simple (Pago Directo)
        </h2>
        <p className="text-[#6B7280] text-sm mt-1">
          Configura tu número de cuenta del Banco Económico (o billetera ZAS). 
          Cuando un cliente pague escaneando el código QR desde cualquier banco de Bolivia, el dinero ingresará directamente a tu cuenta sin comisiones ni intermediarios.
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
          <h3 className="font-semibold text-[#1F2933]">Estado del Servicio</h3>
          {integrations.length === 0 ? (
            <div className="border border-gray-200 bg-gray-50 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-600">Inactivo</p>
                <p className="text-xs text-gray-500 mt-1">
                  Ingresa tu cuenta para activar los pagos QR.
                </p>
              </div>
            </div>
          ) : (
            integrations.map(int => (
              <div key={int.id} className="border border-green-200 bg-green-50 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-green-800">Activado</p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <CheckCircle2 size={12} /> {int.bank_name}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
                  <Building2 size={14} className="text-[#6B7280]" />
                  Entidad Financiera
                </label>
                <input
                  type="text"
                  disabled
                  value="Banco Económico / ZAS"
                  className="w-full border border-[#E5E7EB] bg-gray-50 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 flex items-center gap-2">
                  <Wallet size={14} className="text-[#6B7280]" />
                  Número de Cuenta
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder="Ej: 1051234567"
                  className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !accountNumber}
                className="flex items-center gap-2 bg-[#1F2933] text-white rounded-xl px-6 py-3 font-medium hover:bg-black transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {loading ? "Guardando..." : "Guardar Cuenta"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
