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

  const towerOrder = ["T1", "T2", "T3", "T4", "POD/NTA", "UGWT", "STP"];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: planData } = await supabase
          .from("concrete_plan")
          .select("tower, planned");
        const { data: actualData } = await supabase
          .from("concrete_actual")
          .select("tower, actual");

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
              Planned: plannedSum,
              Actual: actualSum,
            };
          });

          setData(merged);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-8 space-y-12 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-center text-gray-800">
        Project Progress Physical - RCC
      </h1>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border border-gray-300 shadow-md text-center">
          <thead>
            <tr>
              <th className="border px-4 py-3 text-lg">Planned</th>
              {data.map((row, idx) => (
                <td key={idx} className="border px-4 py-3">
                  {row.Planned}%
                </td>
              ))}
            </tr>
            <tr>
              <th className="border px-4 py-3 text-lg">Actual</th>
              {data.map((row, idx) => (
                <td key={idx} className="border px-4 py-3">
                  {row.Actual}%
                </td>
              ))}
            </tr>
            <tr>
              <th className="border px-4 py-3 text-lg">Tower</th>
              {data.map((row, idx) => (
                <td key={idx} className="border px-4 py-3">
                  {row.tower}
                </td>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      {/* Bar Chart */}
      <div className="w-full h-96 bg-white shadow-md rounded-lg p-4">
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <XAxis dataKey="tower" tick={{ fill: "#4B5563", fontWeight: 600 }} />
            <YAxis tick={{ fill: "#4B5563", fontWeight: 500 }} />
            <Tooltip contentStyle={{ backgroundColor: "#f9fafb", borderRadius: 8 }} />
            <Legend />
            <Bar dataKey="Planned" fill="#f87171" radius={[5, 5, 0, 0]} />
            <Bar dataKey="Actual" fill="#60a5fa" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
