import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ITable } from "@/models/table";

interface Room {
  id: string;
  name: string;
  blinds: string;
  pot: string;
  players: string;
  type: string;
  buyIn: string;
  status: string;
  color: string;
}

interface RoomListProps {
  rooms: Room[];
  selectedRoom: { id: string } | null;
  handleSelectRoom: (lobby: ITable) => void;
  joinedTable: (tableId: string) => void;
  lobbies: ITable[];
}

export default function RoomList({ rooms, selectedRoom, handleSelectRoom, joinedTable, lobbies }: RoomListProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="cash"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        className="bg-gray-800/80 backdrop-blur-md rounded-xl shadow-xl overflow-hidden"
      >
        <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] bg-gradient-to-r from-gray-700 to-gray-600 text-gray-200 p-3 text-sm font-bold sticky top-0 z-10">
          <p>Нэр</p>
          <p>төлөв</p>
          <p>Ул</p>
          <p>Тоглогчид</p>
          <p>Суух дүн</p>
          <p>Тоглох</p>
        </div>
        <div className="overflow-y-auto max-h-[calc(100vh-200px)] lg:max-h-[calc(100vh-450px)]">
          {rooms.length > 0 ? (
            rooms.map((room) => (
              <motion.div
                key={room.id}
                whileHover={{ scale: 1.02 }}
                className={`border-b border-gray-700 cursor-pointer ${selectedRoom?.id === room.id ? "bg-gray-700/90" : ""}`}
                onClick={() => handleSelectRoom(lobbies.find((l) => l._id === room.id)!)} // Still needed for desktop selection
              >
                {/* Mobile Layout */}
                <div
                  className="lg:hidden flex"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering handleSelectRoom
                    if (room.players.split("/")[0] !== room.players.split("/")[1]) {
                      joinedTable(room.id); // Navigate to room if not full
                    }
                  }}
                >
                  <div className="flex items-center justify-center bg-blue-600 w-12">
                    <div className="transform -rotate-90 text-white text-xs font-semibold">{room.type}</div>
                  </div>
                  <div className="flex-1 p-4 text-sm flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white font-semibold truncate">{room.name}</p>
                        <p className="text-yellow-300 text-xs">{room.type}</p>
                      </div>
                      <p className="text-white text-xs">Avg. pot: {Number(room.pot).toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <p className="text-red-400 text-xs">{room.players}</p>
                      </div>
                      <p className="text-green-400 text-xs">₮ {room.blinds.toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-blue-300 text-xs">Buy In:</p>
                      <p className="text-blue-300 text-xs">{room.buyIn.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden lg:grid lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] p-4 text-sm gap-2">
                  <p className={`${room.color} font-semibold truncate`}>{room.name}</p>
                  <p className="text-yellow-300">{room.status}</p>
                  <p className="text-yellow-300">{room.blinds.toLocaleString()}</p>
                  <p className="text-red-400">{room.players}</p>
                  <p className="text-blue-300">{room.buyIn.toLocaleString()}</p>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={`px-4 py-1 rounded-lg text-white font-semibold self-start lg:self-auto ${
                      room.players.split("/")[0] === room.players.split("/")[1]
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
                    }`}
                    disabled={room.players.split("/")[0] === room.players.split("/")[1]}
                    onClick={(e) => {
                      e.stopPropagation();
                      joinedTable(room.id);
                    }}
                  >
                    Тоглох
                  </motion.button>
                </div>
              </motion.div>
            ))
          ) : (
            <p className="p-4 text-gray-400">Түр хүлээнэ үү...</p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}