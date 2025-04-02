import React from "react";
import { motion } from "framer-motion";

interface NavbarProps {
  activeTab: "cash" | "tournament";
  setActiveTab: (tab: "cash" | "tournament") => void;
  gameType: string;
  setGameType: (type: string) => void;
  gameTypes: string[];
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export default function Navbar({
  gameType,
  setGameType,
  gameTypes,
}: NavbarProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">

      <div className="flex flex-wrap gap-2 lg:space-x-3">
        {gameTypes.map((type) => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`px-3 py-1 lg:px-4 lg:py-2 rounded-lg shadow-md text-sm lg:text-base ${
              gameType === type
                ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-black"
                : "bg-gray-800 text-white"
            }`}
            onClick={() => setGameType(type)}
          >
            {type}
          </motion.button>
        ))}
      </div>
    </div>
  );
}