"use client";

import { useState, useEffect } from "react";
import { useRestaurantSession } from "@/hooks/useRestaurantSession";
import { LoadingState } from "@/components/LoadingState";
import { supabase } from "@/lib/supabase";
import { Store, UserPlus, Users, X, Plus } from "lucide-react";
import { createBranch, createBranchUser, deleteBranchUser, getBranchUsers } from "./actions";

export default function BranchesPage() {
  const { restaurant, loading: sessionLoading } = useRestaurantSession();
  
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Modal States
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  // Forms
  const [branchForm, setBranchForm] = useState({ name: "", address: "" });
  const [userForm, setUserForm] = useState({ name: "", username: "", password: "", role: "kitchen" });
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    if (!restaurant?.id) return;
    setLoadingData(true);
    
    // Fetch Branches
    const { data: bData } = await supabase
      .from('branches')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: true });
    
    if (bData) setBranches(bData);

    // Fetch Users via server action to bypass RLS
    const res = await getBranchUsers(restaurant.id);
    if (res.users) {
      setUsers(res.users);
    } else {
      console.error("Failed to fetch users:", res.error);
    }
    
    setLoadingData(false);
  };

  useEffect(() => {
    fetchData();
  }, [restaurant?.id]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");

    const res = await createBranch(restaurant!.id, branchForm.name, branchForm.address);
    if (res.error) {
      setError(res.error);
    } else {
      setIsBranchModalOpen(false);
      setBranchForm({ name: "", address: "" });
      fetchData();
    }
    setActionLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");

    const res = await createBranchUser(
      restaurant!.id,
      selectedBranchId,
      userForm.username,
      userForm.name,
      userForm.role,
      userForm.password
    );

    if (res.error) {
      setError(res.error);
    } else {
      setIsUserModalOpen(false);
      setUserForm({ name: "", username: "", password: "", role: "kitchen" });
      fetchData();
    }
    setActionLoading(false);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Estás seguro de eliminar este usuario? Perderá el acceso permanentemente.")) return;
    
    const res = await deleteBranchUser(userId);
    if (res.error) {
      alert("Error: " + res.error);
    } else {
      fetchData();
    }
  };

  if (sessionLoading || loadingData) return <LoadingState />;

  return (
    <div className="space-y-8">
      {/* Branches Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2933]">Sucursales</h1>
          <p className="text-sm text-[#6B7280]">Gestiona tus sucursales y sus perfiles de acceso.</p>
        </div>
        <button
          onClick={() => setIsBranchModalOpen(true)}
          className="bg-[#E76F51] text-white hover:bg-[#D4604A] rounded-xl font-medium px-4 py-2.5 transition-colors flex items-center gap-2"
        >
          <Store className="w-5 h-5" />
          Nueva Sucursal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((b) => (
          <div key={b.id} className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#FDF0EC] text-[#E76F51] flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-[#1F2933]">{b.name}</h3>
              </div>
              <p className="text-sm text-[#6B7280] mt-2">{b.address || "Sin dirección especificada"}</p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
              <button
                onClick={() => {
                  setSelectedBranchId(b.id);
                  setIsUserModalOpen(true);
                }}
                className="w-full text-center px-4 py-2 bg-[#F9FAFB] hover:bg-[#F3F4F6] text-[#1F2933] text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Crear Perfil en {b.name}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Users Section */}
      <div className="pt-8 border-t border-[#E5E7EB]">
        <div className="mb-6 flex items-center gap-2">
          <Users className="w-6 h-6 text-[#1F2933]" />
          <h2 className="text-xl font-bold text-[#1F2933]">Usuarios del Restaurante</h2>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-sm text-[#6B7280]">
                  <th className="px-6 py-4 font-medium">Nombre / Usuario</th>
                  <th className="px-6 py-4 font-medium">Rol</th>
                  <th className="px-6 py-4 font-medium">Sucursal</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#1F2933]">{u.name || "Sin Nombre"}</div>
                      <div className="text-sm text-[#6B7280]">@{u.username || "email"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                        u.role === 'waitstaff' ? 'bg-green-100 text-green-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#1F2933]">
                      {u.branch?.name || "Todas (Dueño)"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.role !== 'owner' && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-[#6B7280]">
                      No hay usuarios registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Branch Modal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsBranchModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#1F2933]">Nueva Sucursal</h2>
              <button onClick={() => setIsBranchModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && <div className="mb-4 text-red-600 bg-red-50 p-3 rounded-xl text-sm">{error}</div>}
            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Nombre</label>
                <input required type="text" value={branchForm.name} onChange={e => setBranchForm({...branchForm, name: e.target.value})} className="w-full border border-[#E5E7EB] rounded-xl px-4 py-2.5" placeholder="Ej: Sucursal Norte" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Dirección</label>
                <input type="text" value={branchForm.address} onChange={e => setBranchForm({...branchForm, address: e.target.value})} className="w-full border border-[#E5E7EB] rounded-xl px-4 py-2.5" placeholder="Ej: Av. Principal #123" />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsBranchModalOpen(false)} className="px-4 py-2 text-[#6B7280] font-medium">Cancelar</button>
                <button type="submit" disabled={actionLoading} className="bg-[#E76F51] text-white px-5 py-2 rounded-xl font-medium disabled:opacity-50">{actionLoading ? "Guardando..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsUserModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#1F2933]">Crear Perfil de Usuario</h2>
              <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && <div className="mb-4 text-red-600 bg-red-50 p-3 rounded-xl text-sm">{error}</div>}
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Nombre del personal</label>
                <input required type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full border border-[#E5E7EB] rounded-xl px-4 py-2.5" placeholder="Ej: Carlos Cocina" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Nombre de Usuario (Login)</label>
                <input required type="text" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full border border-[#E5E7EB] rounded-xl px-4 py-2.5" placeholder="Ej: carlos_cocinero" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Contraseña</label>
                <input required type="text" minLength={6} value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full border border-[#E5E7EB] rounded-xl px-4 py-2.5" placeholder="Mínimo 6 caracteres" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1F2933] mb-1.5 block">Rol</label>
                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="w-full border border-[#E5E7EB] rounded-xl px-4 py-2.5 bg-white">
                  <option value="kitchen">Cocina (Cocina, Menú y Pedidos)</option>
                  <option value="waitstaff">Atención (Mesas, Menú y Pedidos)</option>
                  <option value="admin">Administrador (Acceso Total a la Sucursal)</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-[#6B7280] font-medium">Cancelar</button>
                <button type="submit" disabled={actionLoading} className="bg-[#E76F51] text-white px-5 py-2 rounded-xl font-medium disabled:opacity-50">{actionLoading ? "Creando..." : "Crear Perfil"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

