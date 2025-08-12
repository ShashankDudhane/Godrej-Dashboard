import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-50 to-blue-100 flex items-center justify-center">
      <div className="text-center max-w-3xl px-6">
        {/* Title */}
        <h1 className="text-5xl font-bold mb-4">
          Discover <span className="text-blue-600">Godrej Emerald Waters</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-gray-700 mb-8">
          A premium residential project designed for modern living. 
          Experience unmatched quality, sustainable design, and a lifestyle 
          surrounded by nature — all crafted with the trust of Godrej.
        </p>

        {/* Buttons */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-md hover:bg-blue-700 transition"
          >
            Explore Dashboard
          </button>
          <button
            onClick={() => window.open("https://www.godrejproperties.com", "_blank")}
            className="border border-blue-600 text-blue-600 px-6 py-3 rounded-full shadow-md hover:bg-blue-50 transition"
          >
            Learn More
          </button>
        </div>

        {/* Features */}
        <div className="flex justify-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-green-500">✔</span> RERA Approved
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✔</span> Sustainable Design
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✔</span> Prime Location
          </div>
        </div>
      </div>
    </div>
  );
}
