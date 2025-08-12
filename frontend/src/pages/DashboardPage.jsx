// DashboardPage.tsx
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

export default function DashboardPage() {
  // --- Charts Dummy Data ---
  const rccData = {
    labels: ["T3", "T4", "T2", "T1", "POD/NTA", "UGWT", "STP"],
    datasets: [
      { label: "Planned", data: [30, 27, 29, 25, 39, 12, 13], backgroundColor: "#3b82f6" },
      { label: "Actual", data: [10, 13, 0, 0, 41, 0, 0], backgroundColor: "#ef4444" },
    ],
  };

  const costUpdatesData = {
    labels: ["Jan-25", "Feb-25", "Mar-25", "Apr-25", "May-25", "Jun-25", "Jul-25", "Aug-25", "Sep-25"],
    datasets: [
      { type: "bar", label: "Planned Cash Flow", data: [0.18, 1.09, 0.92, 1.13, 1.01, 1.69, 1.53, 0, 0], backgroundColor: "#f97316" },
      { type: "bar", label: "Actual Billed", data: [0, 1.16, 1.19, 0.87, 1.04, 1.55, 1.48, 0, 0], backgroundColor: "#3b82f6" },
      { type: "line", label: "Cumulative Planned", data: [0, 1.18, 2.1, 3.23, 4.24, 5.93, 7.46, 8.08, 8.08], borderColor: "#facc15", backgroundColor: "#facc15", fill: false },
      { type: "line", label: "Cumulative Billed", data: [0, 1.09, 2.28, 3.15, 4.19, 5.42, 6.9, 8.08, 8.08], borderColor: "#10b981", backgroundColor: "#10b981", fill: false },
    ],
  };

  const manpowerData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
    datasets: [
      { label: "Average Planned (Per Day)", data: [498, 459, 800, 454, 598, 560, 0, 0], backgroundColor: "#3b82f6" },
      { label: "Average Actual (Per Day)", data: [182, 199, 354, 400, 453, 205, 0, 0], backgroundColor: "#ef4444" },
    ],
  };

  const concreteData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
    datasets: [
      { label: "Planned", data: [541, 1303, 1137, 926, 985, 0, 0, 0], backgroundColor: "#3b82f6" },
      { label: "Actual", data: [421, 1035, 982, 904, 2264, 518, 0, 0], backgroundColor: "#ef4444" },
    ],
  };

  // --- Table Data ---
  const towerData = [
    { tower: "T3", planned: "18-11-2025", projected: "26-02-2027", variance: 84 },
    { tower: "T2", planned: "27-11-2026", projected: "24-02-2027", variance: 74 },
    { tower: "T4", planned: "08-12-2026", projected: "23-04-2027", variance: 136 },
    { tower: "T1", planned: "22-07-2026", projected: "04-12-2027", variance: 158 },
    { tower: "POD/NTA", planned: "15-05-2026", projected: "15-09-2026", variance: 123 },
    { tower: "UGWT", planned: "12-04-2026", projected: "12-08-2026", variance: -12 },
    { tower: "STP", planned: "20-09-2026", projected: "25-10-2026", variance: 5 },
  ];

  const steelStock = [
    { sr: 1, dia: "8 mm", total: 204.171, stock: 82.04, consumed: 121.775 },
    { sr: 2, dia: "10 mm", total: 50.21, stock: 40.04, consumed: 10.17 },
    { sr: 3, dia: "12 mm", total: 180.512, stock: 78.12, consumed: 102.392 },
    { sr: 4, dia: "16 mm", total: 225.431, stock: 95.76, consumed: 129.671 },
    { sr: 5, dia: "20 mm", total: 150.25, stock: 70.25, consumed: 80 },
    { sr: 6, dia: "25 mm", total: 99.85, stock: 45.5, consumed: 54.35 },
  ];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-3xl font-bold">Godrej Emerald Waters - Weekly/Monthly Progress Report</h2>
      <p className="text-gray-500">Updated on: 05-08-2025</p>

      {/* RCC */}
      <div className="bg-white p-4 shadow rounded">
        <h3 className="text-xl font-semibold mb-4">A. Project Progress Physical (RCC)</h3>
        <Bar data={rccData} />
      </div>

      {/* Cost Updates */}
      <div className="bg-white p-4 shadow rounded">
        <h3 className="text-xl font-semibold mb-4">B. Cost Updates (All figures in Cr)</h3>
        <Bar data={costUpdatesData} />
      </div>

      {/* Manpower */}
      <div className="bg-white p-4 shadow rounded">
        <h3 className="text-xl font-semibold mb-4">A1. Manpower</h3>
        <Bar data={manpowerData} />
      </div>

      {/* Concrete */}
      <div className="bg-white p-4 shadow rounded">
        <h3 className="text-xl font-semibold mb-4">A2. Concrete</h3>
        <Bar data={concreteData} />
      </div>

      {/* Completion Date */}
      <div className="bg-white p-4 shadow rounded">
        <h3 className="text-xl font-semibold mb-4">B1. Project Completion Date</h3>
        <table className="w-full border">
          <tbody>
            <tr><td className="border p-2">Baseline Finish Date</td><td className="border p-2">08-12-2026</td></tr>
            <tr><td className="border p-2">Projected Finish</td><td className="border p-2">23-04-2027</td></tr>
            <tr><td className="border p-2">Finish Variance</td><td className="border p-2">113 days</td></tr>
          </tbody>
        </table>
      </div>

      {/* Towerwise Table */}
      <div className="bg-white p-4 shadow rounded">
        <h3 className="text-xl font-semibold mb-4">B2. Planned and Projected Finish Dates (Towerwise)</h3>
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Tower</th>
              <th className="border p-2">Planned Finish</th>
              <th className="border p-2">Projected Finish</th>
              <th className="border p-2">Variance (Days)</th>
            </tr>
          </thead>
          <tbody>
            {towerData.map((t, i) => (
              <tr key={i}>
                <td className="border p-2">{t.tower}</td>
                <td className="border p-2">{t.planned}</td>
                <td className="border p-2">{t.projected}</td>
                <td className={`border p-2 font-bold ${t.variance > 0 ? "text-red-600" : "text-green-600"}`}>
                  {t.variance}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Issues */}
      <div className="bg-white p-4 shadow rounded">
        <h3 className="text-xl font-semibold mb-4">B3. Top Critical Issues of the Project</h3>
        <ul className="list-disc pl-6">
          <li>WP and Filling work</li>
          <li>Balance Labour Mobilization</li>
        </ul>
      </div>

      {/* Non-Negotiables */}
      <div className="bg-white p-4 shadow rounded">
        <h3 className="text-xl font-semibold mb-4">B4. Non-Negotiables for this Month</h3>
        <ul className="list-disc pl-6">
          <li>Tower 2 – T2 balance Slab – Slab 3, Podium 1 Slab</li>
          <li>Tower 3 – GF Slab, Tower 3 Podium 1 Slab</li>
        </ul>
      </div>

      {/* Steel Stock */}
      <div className="bg-white p-4 shadow rounded">
        <h3 className="text-xl font-semibold mb-4">C. Steel Stock Report</h3>
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Sr. No</th>
              <th className="border p-2">Dia.</th>
              <th className="border p-2">Total Received (MT)</th>
              <th className="border p-2">Stock @ Site (MT)</th>
              <th className="border p-2">Consumed (MT)</th>
            </tr>
          </thead>
          <tbody>
            {steelStock.map((s, i) => (
              <tr key={i}>
                <td className="border p-2">{s.sr}</td>
                <td className="border p-2">{s.dia}</td>
                <td className="border p-2">{s.total}</td>
                <td className="border p-2">{s.stock}</td>
                <td className="border p-2">{s.consumed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Manhours */}
      <div className="bg-white p-4 shadow rounded">
        <h3 className="text-xl font-semibold mb-4">D. Cumulative Safe Manhours</h3>
        <p className="text-2xl font-bold text-green-600">2,17,014</p>
      </div>
    </div>
  );
}
