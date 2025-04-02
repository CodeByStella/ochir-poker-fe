import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Tournament {
  id: string;
  name: string;
  time: string;
  buyIn: string;
  prize: string;
  status: string;
}

interface TournamentListProps {
  tournaments: Tournament[];
}

export default function TournamentList({ tournaments }: TournamentListProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="tournament"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        className="bg-gray-800/80 backdrop-blur-md rounded-xl shadow-xl overflow-hidden"
      >
        <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] bg-gradient-to-r from-gray-700 to-gray-600 text-gray-200 p-3 text-sm font-bold sticky top-0 z-10">
          <p>Tournament</p>
          <p>Time</p>
          <p>Status</p>
          <p>Buy-In</p>
          <p>Prize</p>
          <p>Action</p>
        </div>
        <div className="overflow-y-auto max-h-[calc(100vh-300px)] lg:max-h-[calc(100vh-450px)]">
          {tournaments.map((tournament) => (
            <motion.div
              key={tournament.id}
              whileHover={{ scale: 1.02 }}
              className="p-3 border-b border-gray-700 text-sm flex flex-col lg:grid lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 lg:gap-0"
            >
              <p className="text-yellow-300 font-semibold truncate">{tournament.name}</p>
              <p>{tournament.time}</p>
              <p className="text-yellow-300">{tournament.status}</p>
              <p className="text-blue-300">{tournament.buyIn}</p>
              <p className="text-green-400">{tournament.prize}</p>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1 rounded-lg text-white font-semibold hover:from-blue-500 hover:to-indigo-500 self-start lg:self-auto"
              >
                Тоглох
              </motion.button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}