"use client";

import { useState, useEffect, useTransition } from "react";
import { getPlatformAdmins, addPlatformAdmin, removePlatformAdmin } from "../actions";
import { PlatformAdmin } from "@/shared/types";
import { 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Mail, 
  User, 
  Calendar,
  Lock,
  Info
} from "lucide-react";

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getPlatformAdmins();
      setAdmins(list);
    } catch (err: any) {
      console.error("Error loading admins:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await addPlatformAdmin(newEmail.trim(), newName.trim() || undefined);
        setSuccessMsg(`SuperAdmin agregado exitosamente: ${newEmail}`);
        setNewEmail("");
        setNewName("");
        await loadData();
      } catch (err: any) {
        setErrorMsg(err.message || "Error al agregar SuperAdmin");
      }
    });
  };

  const handleRemoveAdmin = (admin: PlatformAdmin) => {
    if (!window.confirm(`¿Quitar privilegios de SuperAdmin para ${admin.email}?`)) return;

    startTransition(async () => {
      try {
        await removePlatformAdmin(admin.id);
        setSuccessMsg(`SuperAdmin removido: ${admin.email}`);
        await loadData();
      } catch (err: any) {
        setErrorMsg(err.message || "Error al remover SuperAdmin");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Administradores de la Plataforma
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Usuarios con acceso total al panel SuperAdmin de Servido para gestionar suscripciones, módulos y clientes.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Info Notice */}
      <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-start gap-3">
        <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 leading-relaxed">
          <span className="font-bold">Seguridad y Respaldo:</span> Además de los usuarios listados abajo, cualquier correo configurado en la variable de entorno <code className="bg-indigo-100 px-1 py-0.5 rounded font-mono font-bold">SUPERADMIN_EMAILS</code> (por defecto <code className="bg-indigo-100 px-1 py-0.5 rounded font-mono">admin@servido.app</code>) tiene acceso garantizado permanente para evitar bloqueos del sistema.
        </div>
      </div>

      {/* Add Admin Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus size={18} className="text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">
            Agregar Nuevo SuperAdmin
          </h2>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Correo Electrónico (Registrado en Servido)
            </label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="admin@empresa.com"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre Completo (Opcional)
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Carlos Pérez"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isPending || !newEmail.trim()}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ShieldCheck size={16} />
              <span>{isPending ? "Agregando..." : "Otorgar Acceso SuperAdmin"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Admins Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            Administradores Registrados ({admins.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-6">Usuario</th>
                <th className="py-3 px-6">Rol de Plataforma</th>
                <th className="py-3 px-6">Fecha de Alta</th>
                <th className="py-3 px-6 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
                    Cargando administradores...
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400 text-xs">
                    No hay administradores registrados en la base de datos (los definidos en SUPERADMIN_EMAILS mantienen acceso por variable de entorno).
                  </td>
                </tr>
              ) : (
                admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {adm.email.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{adm.full_name || adm.email}</div>
                          <div className="text-xs text-slate-400 font-mono">{adm.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <ShieldCheck size={12} />
                        SuperAdmin
                      </span>
                    </td>

                    <td className="py-3.5 px-6 text-xs text-slate-500">
                      {adm.created_at ? new Date(adm.created_at).toLocaleDateString("es-BO") : "—"}
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => handleRemoveAdmin(adm)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Quitar privilegios"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

