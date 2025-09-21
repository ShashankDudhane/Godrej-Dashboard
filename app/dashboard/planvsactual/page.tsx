"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type DashboardRow = {
  tower: string;
  Planned: number;
  Actual: number;
};

export default function PlanVsActualPage() {
  const [data, setData] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const towerOrder = ["T1", "T2", "T3", "T4", "POD/NTA", "UGWT", "STP"];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: planData, error: planError } = await supabase
          .from("concrete_plan")
          .select("tower, planned");
        const { data: actualData, error: actualError } = await supabase
          .from("concrete_actual")
          .select("tower, actual");

        if (planError || actualError) {
            console.error("Supabase error:", planError || actualError);
            setError("Failed to fetch data from the database.");
            setLoading(false);
            return;
        }

        if (planData && actualData) {
          const merged: DashboardRow[] = towerOrder.map((tower) => {
            const plannedSum = planData
              .filter((p) => p.tower === tower)
              .reduce((sum, p) => sum + Number(p.planned || 0), 0);
            const actualSum = actualData
              .filter((a) => a.tower === tower)
              .reduce((sum, a) => sum + Number(a.actual || 0), 0);
            return {
              tower,
              Planned: parseFloat(plannedSum.toFixed(2)), // Format to 2 decimal places
              Actual: parseFloat(actualSum.toFixed(2)),   // Format to 2 decimal places
            };
          });

          setData(merged);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("An unexpected error occurred while fetching data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-xl font-semibold text-indigo-600">Loading Dashboard Data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-xl font-semibold text-red-600 p-8 bg-white rounded-xl shadow-lg">Error: {error}</div>
      </div>
    );
  }

  // Calculate total planned and actual for the footer summary
  const totalPlanned = data.reduce((sum, row) => sum + row.Planned, 0).toFixed(2);
  const totalActual = data.reduce((sum, row) => sum + row.Actual, 0).toFixed(2);

  return (
    <div className="p-4 sm:p-8 space-y-10 bg-gray-50 min-h-screen font-sans">
      <header className="py-4 border-b border-gray-200">
        <h1 className="text-3xl font-extrabold text-center text-gray-800 tracking-tight">
          Project Progress Physical - RCC Dashboard 🏗️
        </h1>
        <p className="text-center text-sm text-gray-500 mt-1">Plan vs. Actual Concrete Pouring Progress by Tower</p>
      </header>

      {/* --- */}

      {/* Data Table */}
      <section>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Detailed Progress Table</h2>
        <div className="overflow-x-auto bg-white rounded-xl shadow-xl">
          <table className="min-w-full divide-y divide-gray-200 text-center">
            <thead className="bg-indigo-50">
              <tr>
                <th className="py-3 px-2 sm:px-4 text-left text-sm font-medium text-indigo-700 uppercase tracking-wider sticky left-0 bg-indigo-50 z-10">
                  Metric
                </th>
                {data.map((row) => (
                  <th
                    key={row.tower}
                    className="py-3 px-2 sm:px-4 text-sm font-medium text-indigo-700 uppercase tracking-wider"
                  >
                    {row.tower}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Planned Row */}
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <th className="py-3 px-2 sm:px-4 text-left text-base font-semibold text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10">
                  Planned (%)
                </th>
                {data.map((row, idx) => (
                  <td key={idx} className="py-3 px-2 sm:px-4 text-base font-medium text-red-600">
                    {row.Planned}%
                  </td>
                ))}
              </tr>
              {/* Actual Row */}
              <tr className="hover:bg-gray-50 transition duration-150 ease-in-out">
                <th className="py-3 px-2 sm:px-4 text-left text-base font-semibold text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10">
                  Actual (%)
                </th>
                {data.map((row, idx) => (
                  <td key={idx} className="py-3 px-2 sm:px-4 text-base font-medium text-blue-600">
                    {row.Actual}%
                  </td>
                ))}
              </tr>
            </tbody>
            {/* Table Footer for Totals */}
            <tfoot className="bg-gray-100 border-t border-gray-200">
              <tr>
                <th className="py-3 px-2 sm:px-4 text-left text-base font-bold text-gray-900 whitespace-nowrap sticky left-0 bg-gray-100 z-10">
                  Project Total
                </th>
                <td colSpan={data.length} className="py-3 px-2 sm:px-4 text-base font-bold text-gray-900 text-center">
                  Planned: <span className="text-red-600">{totalPlanned}%</span> / Actual: <span className="text-blue-600">{totalActual}%</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* --- */}

      {/* Bar Chart */}
      <section>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Visual Progress Comparison</h2>
        <div className="w-full h-[400px] bg-white shadow-xl rounded-xl p-4 md:p-6 border border-gray-100">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis
                dataKey="tower"
                stroke="#374151" // Darker axis line
                tick={{ fill: "#4B5563", fontWeight: 600, fontSize: 12 }}
                tickLine={false} // Remove tick lines for cleaner look
              />
              <YAxis
                stroke="#374151"
                tick={{ fill: "#4B5563", fontWeight: 500, fontSize: 12 }}
                tickLine={false}
                axisLine={false} // Remove y-axis line
                unit="%" // Add percentage unit
              />
              <Tooltip
                cursor={{ fill: "rgba(100, 116, 139, 0.1)" }} // Light slate background on hover
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: 12,
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  border: "1px solid #e5e7eb"
                }}
                labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
                formatter={(value: number) => [`${value}%`, 'Value']}
              />
              {/* FIX: Removed custom 'payload' prop from Legend */}
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="circle"
              />
              <Bar dataKey="Planned" fill="#EF4444" radius={[6, 6, 0, 0]} barSize={30} />
              <Bar dataKey="Actual" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}