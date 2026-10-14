"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, Check, AlertCircle } from "lucide-react";

interface NewTableModalProps {
  restaurantId: string;
  branchId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function NewTableModal({
  restaurantId,
  branchId,
  isOpen,
  onClose,
  onSaved,
}: NewTableModalProps) {
  const [tableNumber, setTableNumber] = useState("");
  const [type, setType] = useState<"dine_in" | "takeaway">("dine_in");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) {
      setError(
        type === "takeaway"
          ? "El nombre o número de barra es obligatorio"
          : "El número de mesa es obligatorio"
      );
      return;
    }

    setSaving(true);
    setError("");

    const prefix = type === "takeaway" ? "BARRA" : "MESA";
    const tableCode = `${prefix}-${tableNumber.trim()}`;

    const insertData: any = {
      restaurant_id: restaurantId,
      table_number: tableNumber.trim(),
      table_code: tableCode,
      is_active: true,
      type,
    };

    if (branchId) {
      insertData.branch_id = branchId;
    }

    const { error: err } = await supabase.from("tables").insert(insertData);

    if (err) {
      if (
        err.message.includes("tables_table_code_key") ||
        err.message.includes("duplicate key")
      ) {
        setError(`El código ${tableCode} ya está en uso. Por favor, elige otro número o nombre.`);
      } else {
        setError(err.message);
      }
      setSaving(false);
      return;
    }

    setSaving(false);
    setTableNumber("");
    onSaved();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#1F2933]">
            {type === "takeaway" ? "Nueva barra / Takeaway" : "Nueva mesa de salón"}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
              Tipo de ubicación
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("dine_in")}
                className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold transition-all text-center ${
                  type === "dine_in"
                    ? "bg-[#E76F51]/10 border-[#E76F51] text-[#E76F51]"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
              >
                Mesa Salón
              </button>
              <button
                type="button"
                onClick={() => setType("takeaway")}
                className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold transition-all text-center ${
                  type === "takeaway"
                    ? "bg-[#E76F51]/10 border-[#E76F51] text-[#E76F51]"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
              >
                Barra / Fila
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
              {type === "takeaway" ? "Identificador de barra *" : "Número o nombre de mesa *"}
            </label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#1F2933] font-medium focus:outline-none focus:ring-2 focus:ring-[#E76F51]/30 focus:border-[#E76F51] transition-colors"
              placeholder={type === "takeaway" ? "Ej: Barra 1, Pedidos, Caja..." : "Ej: 1, 2, Terraza 4..."}
              autoFocus
            />
            {tableNumber.trim() && (
              <p className="text-xs text-gray-500 mt-2 font-mono">
                Código QR asignado:{" "}
                <span className="font-bold text-[#E76F51]">
                  {type === "takeaway" ? "BARRA" : "MESA"}-{tableNumber.trim()}
                </span>
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 font-bold rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#E76F51] hover:bg-[#d65e40] text-white font-bold rounded-xl px-4 py-3 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              {saving ? (
                "Guardando..."
              ) : (
                <>
                  <Check size={16} />
                  <span>{type === "takeaway" ? "Crear barra" : "Crear mesa"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

