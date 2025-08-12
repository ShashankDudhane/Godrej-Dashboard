import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const [userEmail, setUserEmail] = useState(null);

useEffect(() => {
  fetch("http://localhost:5000/api/auth/user", { credentials: "include" })
    .then((res) => {
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    })
    .then((data) => {
      setUserEmail(data.email);
    })
    .catch(() => {
      setUserEmail(null);
    });
}, []);


  return (
    <nav className="bg-white shadow-md fixed top-0 left-0 w-full z-50">
      <div className="max-w-7xl  px-4 sm:px-6 lg:px-1">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Green box + Title */}
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-green-600 text-white font-semibold rounded-sm px-3 py-1 text-sm select-none">
              GEW
            </div>
            <span className="text-blue-600 font-medium text-lg select-none">
              Godrej Emerald Waters
            </span>
          </Link>

          {/* Right side - Show logged-in user email */}
          <div className="text-gray-700 text-sm font-medium select-none">
            {userEmail ? userEmail : "Not logged in"}
          </div>
        </div>
      </div>
    </nav>
  );
}
