'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { LoadingState } from '@/components/LoadingState';
import { TrendingUp, AlertTriangle, DollarSign, Activity } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface FoodCostData {
  productId: string;
  name: string;
  price: number;
  cost: number;
  foodCostPercentage: number;
  margin: number;
  category: string;
  isProfitable: boolean;
  status: 'excellent' | 'good' | 'danger';
}

export function FoodCostView({ restaurantId, branchId }: { restaurantId: string; branchId: string }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FoodCostData[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Fetch products
        const { data: products } = await supabase
          .from('products')
          .select('*, categories(name)')
          .eq('restaurant_id', restaurantId);
        
        if (!products) return;

        // 2. Fetch recipes with their items
        const { data: recipes } = await supabase
          .from('product_recipes')
          .select('*, inventory_items!inner(cost_per_unit, branch_id)')
          .eq('inventory_items.branch_id', branchId);

        if (!recipes) return;

        const calculatedStats: FoodCostData[] = products.map(product => {
          // find all ingredients for this product
          const productRecipes = recipes.filter(r => r.product_id === product.id);
          
          let totalCost = 0;
          productRecipes.forEach(r => {
            const qty = r.quantity_required || 0;
            const unitCost = (r.inventory_items as any)?.cost_per_unit || 0;
            totalCost += qty * unitCost;
          });

          const price = product.price || 0;
          const margin = price - totalCost;
          const fcPercentage = price > 0 ? (totalCost / price) * 100 : 0;

          let status: 'excellent' | 'good' | 'danger' = 'good';
          if (fcPercentage > 35) status = 'danger'; // Costo muy alto
          else if (fcPercentage < 25 && fcPercentage > 0) status = 'excellent'; // Excelente rentabilidad

          return {
            productId: product.id,
            name: product.name,
            price,
            cost: totalCost,
            foodCostPercentage: fcPercentage,
            margin,
            category: (product.categories as any)?.name || 'Sin Categoría',
            isProfitable: margin > 0,
            status
          };
        }).sort((a, b) => b.foodCostPercentage - a.foodCostPercentage); // Sort by highest cost first

        setStats(calculatedStats.filter(s => s.cost > 0)); // Only show products that have recipes setup
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [restaurantId, branchId]);

  if (loading) return <LoadingState />;

  const chartData = stats.map(s => ({
    name: s.name,
    'Food Cost %': Number(s.foodCostPercentage.toFixed(1)),
    'Margen (Bs)': Number(s.margin.toFixed(2))
  })).slice(0, 15); // Show top 15 for the chart

  const averageFC = stats.length > 0 
    ? stats.reduce((acc, curr) => acc + curr.foodCostPercentage, 0) / stats.length
    : 0;

  const dangerCount = stats.filter(s => s.status === 'danger').length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col p-6 h-[calc(100vh-14rem)] overflow-y-auto">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-[#1F2933]">Análisis de Food Cost</h2>
          <p className="text-sm text-gray-500">Rentabilidad teórica basada en recetas y costo promedio de insumos</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <Activity size={20} />
            </div>
            <h3 className="font-medium text-gray-600">Food Cost Promedio</h3>
          </div>
          <p className="text-3xl font-bold text-[#1F2933]">{averageFC.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">El ideal en gastronomía es 25% - 35%</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-100 p-2 rounded-lg text-red-600">
              <AlertTriangle size={20} />
            </div>
            <h3 className="font-medium text-gray-600">Platos en Riesgo</h3>
          </div>
          <p className="text-3xl font-bold text-[#1F2933]">{dangerCount}</p>
          <p className="text-xs text-gray-500 mt-1">Platos con Food Cost mayor al 35%</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-100 p-2 rounded-lg text-green-600">
              <DollarSign size={20} />
            </div>
            <h3 className="font-medium text-gray-600">Platos Analizados</h3>
          </div>
          <p className="text-3xl font-bold text-[#1F2933]">{stats.length}</p>
          <p className="text-xs text-gray-500 mt-1">Con recetas configuradas</p>
        </div>
      </div>

      {/* Chart */}
      {stats.length > 0 && (
        <div className="mb-10 shrink-0">
          <h3 className="text-lg font-bold text-[#1F2933] mb-4">Top 15 - Distribución de Costos</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80} 
                  tick={{fontSize: 11}}
                  interval={0}
                />
                <YAxis yAxisId="left" tick={{fontSize: 12}} />
                <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <ReferenceLine y={35} yAxisId="left" stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Límite (35%)', fill: '#ef4444', fontSize: 10 }} />
                <Bar yAxisId="left" dataKey="Food Cost %" fill="#2F4F3E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table */}
      <h3 className="text-lg font-bold text-[#1F2933] mb-4 shrink-0">Detalle por Producto</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-[#E5E7EB] text-sm text-gray-500">
              <th className="pb-3 font-medium">Producto</th>
              <th className="pb-3 font-medium text-center">Precio Venta</th>
              <th className="pb-3 font-medium text-center">Costo Receta</th>
              <th className="pb-3 font-medium text-center">Margen</th>
              <th className="pb-3 font-medium text-center">Food Cost %</th>
              <th className="pb-3 font-medium text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  <Activity size={48} className="mx-auto mb-4 opacity-30" />
                  <p>No hay recetas configuradas aún para calcular el Food Cost.</p>
                </td>
              </tr>
            ) : (
              stats.map(s => (
                <tr key={s.productId} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-4">
                    <p className="font-bold text-[#1F2933]">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.category}</p>
                  </td>
                  <td className="py-4 text-center text-[#1F2933]">Bs {s.price.toFixed(2)}</td>
                  <td className="py-4 text-center text-[#1F2933]">Bs {s.cost.toFixed(2)}</td>
                  <td className="py-4 text-center font-medium text-[#1F2933]">Bs {s.margin.toFixed(2)}</td>
                  <td className="py-4 text-center">
                    <span className={`font-bold ${s.status === 'danger' ? 'text-red-600' : s.status === 'excellent' ? 'text-green-600' : 'text-blue-600'}`}>
                      {s.foodCostPercentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-4 text-center">
                    {s.status === 'danger' ? (
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-medium">Riesgo (Alto Costo)</span>
                    ) : s.status === 'excellent' ? (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-medium">Excelente</span>
                    ) : (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-medium">Óptimo</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
