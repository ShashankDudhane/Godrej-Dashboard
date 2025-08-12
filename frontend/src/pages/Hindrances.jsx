import React, { useState, useEffect } from "react";

export default function Hindrances() {
  // Mock initial data
  const initialTowerwise = [
    { tower: "T3", planned: "18-11-2025", projected: "26-02-2027", variance: 84 },
    { tower: "T2", planned: "27-11-2026", projected: "24-02-2027", variance: 74 },
    { tower: "T4", planned: "08-12-2026", projected: "23-04-2027", variance: 136 },
    { tower: "T1", planned: "22-07-2026", projected: "04-01-2027", variance: 158 },
    { tower: "POD/NTA", planned: "21-05-2026", projected: "15-09-2026", variance: 158 },
    { tower: "UGWT", planned: "22-04-2026", projected: "07-08-2026", variance: 116 },
    { tower: "STP", planned: "02-04-2026", projected: "09-05-2026", variance: 36 },
  ];

  const initialIssues = [
    "Tower 2 - T2 balance Slab 3, Podium 1 Slab",
    "Tower 3 GF Slab, Tower 3 Podium 1 Slab",
    "Tower 4 QW Completion till GF, WP & backfilling",
    "UGWT RT wall"
  ];

  const initialNonNegotiables = [
    "WP and Filling work",
    "Balance Labour Mobilization"
  ];

  const initialSteelStock = [
    { dia: "8 mm", total: 204.171, stock: 82.04, consumed: 121.775 },
    { dia: "10 mm", total: 50.210, stock: 40.04, consumed: 10.170 },
    { dia: "12 mm", total: 201.445, stock: 176.87, consumed: 24.576 },
    { dia: "16 mm", total: 270.856, stock: 172.27, consumed: 98.586 },
    { dia: "20 mm", total: 559.353, stock: 231.69, consumed: 327.667 },
    { dia: "25 mm", total: 139.427, stock: 10.96, consumed: 128.472 },
    { dia: "28 mm", total: 13.028, stock: 9.31, consumed: 3.717 },
  ];

  const [towerwise, setTowerwise] = useState(initialTowerwise);
  const [issues, setIssues] = useState(initialIssues);
  const [nonNegotiables, setNonNegotiables] = useState(initialNonNegotiables);
  const [steelStock, setSteelStock] = useState(initialSteelStock);

  const handleSave = () => {
    // In real app, replace with fetch/axios POST to your DB
    console.log("Saved Data:", { towerwise, issues, nonNegotiables, steelStock });
    alert("Data saved successfully (mock)!");
  };

  return (
    <div className="p-6 space-y-8">
      <h2 className="text-2xl font-bold mb-4">Hindrances & Other Inputs</h2>

      {/* Form Section */}
      <div className="bg-white shadow-lg rounded-lg p-4 space-y-6">
        {/* Towerwise Finish Dates */}
        <div>
          <h3 className="font-semibold mb-2">Towerwise Planned & Projected Finish Dates</h3>
          {towerwise.map((row, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-4 mb-2">
              <input
                className="border p-2 rounded"
                value={row.tower}
                onChange={(e) => {
                  const updated = [...towerwise];
                  updated[idx].tower = e.target.value;
                  setTowerwise(updated);
                }}
              />
              <input
                type="date"
                className="border p-2 rounded"
                value={row.planned}
                onChange={(e) => {
                  const updated = [...towerwise];
                  updated[idx].planned = e.target.value;
                  setTowerwise(updated);
                }}
              />
              <input
                type="date"
                className="border p-2 rounded"
                value={row.projected}
                onChange={(e) => {
                  const updated = [...towerwise];
                  updated[idx].projected = e.target.value;
                  setTowerwise(updated);
                }}
              />
              <input
                type="number"
                className="border p-2 rounded"
                value={row.variance}
                onChange={(e) => {
                  const updated = [...towerwise];
                  updated[idx].variance = e.target.value;
                  setTowerwise(updated);
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Critical Issues */}
        <div>
          <h3 className="font-semibold mb-2">Top Critical Issues</h3>
          {issues.map((issue, idx) => (
            <input
              key={idx}
              className="border p-2 rounded mb-2 w-full"
              value={issue}
              onChange={(e) => {
                const updated = [...issues];
                updated[idx] = e.target.value;
                setIssues(updated);
              }}
            />
          ))}
        </div>

        {/* Non-Negotiables */}
        <div>
          <h3 className="font-semibold mb-2">Non-Negotiables</h3>
          {nonNegotiables.map((item, idx) => (
            <input
              key={idx}
              className="border p-2 rounded mb-2 w-full"
              value={item}
              onChange={(e) => {
                const updated = [...nonNegotiables];
                updated[idx] = e.target.value;
                setNonNegotiables(updated);
              }}
            />
          ))}
        </div>

        {/* Steel Stock Report */}
        <div>
          <h3 className="font-semibold mb-2">Steel Stock Report</h3>
          {steelStock.map((row, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-4 mb-2">
              <input
                className="border p-2 rounded"
                value={row.dia}
                onChange={(e) => {
                  const updated = [...steelStock];
                  updated[idx].dia = e.target.value;
                  setSteelStock(updated);
                }}
              />
              <input
                type="number"
                className="border p-2 rounded"
                value={row.total}
                onChange={(e) => {
                  const updated = [...steelStock];
                  updated[idx].total = e.target.value;
                  setSteelStock(updated);
                }}
              />
              <input
                type="number"
                className="border p-2 rounded"
                value={row.stock}
                onChange={(e) => {
                  const updated = [...steelStock];
                  updated[idx].stock = e.target.value;
                  setSteelStock(updated);
                }}
              />
              <input
                type="number"
                className="border p-2 rounded"
                value={row.consumed}
                onChange={(e) => {
                  const updated = [...steelStock];
                  updated[idx].consumed = e.target.value;
                  setSteelStock(updated);
                }}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Save Data
        </button>
      </div>

      {/* Tables Section */}
      <div className="space-y-8">
        {/* Towerwise Table */}
        <div>
          <h3 className="font-semibold mb-2">Towerwise Finish Dates</h3>
          <table className="table-auto w-full border">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">Tower</th>
                <th className="border p-2">Planned</th>
                <th className="border p-2">Projected</th>
                <th className="border p-2">Variance (days)</th>
              </tr>
            </thead>
            <tbody>
              {towerwise.map((row, idx) => (
                <tr key={idx}>
                  <td className="border p-2">{row.tower}</td>
                  <td className="border p-2">{row.planned}</td>
                  <td className="border p-2">{row.projected}</td>
                  <td
                    className={`border p-2 font-semibold ${
                      row.variance > 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {row.variance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Critical Issues Table */}
        <div>
          <h3 className="font-semibold mb-2">Top Critical Issues</h3>
          <table className="table-auto w-full border">
            <tbody>
              {issues.map((issue, idx) => (
                <tr key={idx}>
                  <td className="border p-2">{issue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Non-Negotiables Table */}
        <div>
          <h3 className="font-semibold mb-2">Non-Negotiables</h3>
          <table className="table-auto w-full border">
            <tbody>
              {nonNegotiables.map((item, idx) => (
                <tr key={idx}>
                  <td className="border p-2">{item}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Steel Stock Table */}
        <div>
          <h3 className="font-semibold mb-2">Steel Stock Report</h3>
          <table className="table-auto w-full border">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">Dia</th>
                <th className="border p-2">Total Received</th>
                <th className="border p-2">Stock @ Site</th>
                <th className="border p-2">Consumed</th>
              </tr>
            </thead>
            <tbody>
              {steelStock.map((row, idx) => (
                <tr key={idx}>
                  <td className="border p-2">{row.dia}</td>
                  <td className="border p-2">{row.total}</td>
                  <td className="border p-2">{row.stock}</td>
                  <td className="border p-2">{row.consumed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
