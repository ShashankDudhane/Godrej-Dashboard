import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import {
  FaTachometerAlt, FaFileAlt, FaRegImage, FaCubes, FaChartLine, FaUsers, FaMoneyBillWave,
  FaChevronLeft, FaChevronRight
} from "react-icons/fa";

export default function Sidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  // Assign color to each icon as per screenshot style
  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: <FaTachometerAlt color="#2563EB" /> }, // Blue
    { path: "/dashboard/hindrances", label: "Hindrances & Other Inputs", icon: <FaFileAlt color="#16A34A" /> }, // Green
    { path: "/dashboard/drawings", label: "Drawings & Approvals", icon: <FaRegImage color="#0284C7" /> }, // Light Blue
    { path: "/dashboard/concrete", label: "Cum. Concrete", icon: <FaCubes color="#9333EA" /> }, // Purple
    { path: "/dashboard/plan-actual", label: "Plan Vs Actual", icon: <FaChartLine color="#047857" /> }, // Dark Green
    { path: "/dashboard/manpower", label: "Cum. Manpower", icon: <FaUsers color="#F43F5E" /> }, // Pink/Red
    { path: "/dashboard/cashflow", label: "Cum. Cashflow", icon: <FaMoneyBillWave color="#22C55E" /> }, // Lime Green
  ];

  const handleLogout = async () => {
    try {
      await axios.post("http://localhost:5000/api/auth/logout", {}, { withCredentials: true });
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <div
      className={`bg-white text-black h-screen flex flex-col justify-between transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
      style={{ borderRight: "1px solid #e5e7eb" }} // subtle border
    >
      {/* Top Menu */}
      <div>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!collapsed && <h2 className="text-xl font-bold text-gray-900">Godrej Emerald Waters</h2>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-700 hover:bg-gray-200 p-2 rounded"
          >
            {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        </div>
        <ul>
          {menuItems.map((item) => (
            <li key={item.path} className="mb-1">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 p-2 rounded hover:bg-gray-100 transition ${
                    isActive ? "bg-gray-200 font-semibold" : "font-normal"
                  }`
                }
              >
                <span className="text-lg">{item.icon}</span>
                {!collapsed && <span className="text-gray-900">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
       <button
  onClick={handleLogout}
  className="border border-red-600 text-red-600 py-2 px-4 rounded w-full
             hover:bg-red-600 hover:text-white transition-colors duration-200"
>
  {!collapsed ? "Logout" : <span className="text-lg">🚪</span>}
</button>

      </div>
    </div>
  );
}
