import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { PokerTableSVG } from "./../../app/(private)/table/[id]/PokerTableSVG";
import gift from "../../../public/gift.gif";
import { IPlayer } from "@/models/player";

interface SelectedRoomProps {
  selectedRoom: {
    id: string;
    name: string;
    players: { username: string; flag: string; amount: string }[];
    tableData?: any;
  } | null;
  isSelectedRoomVisible: boolean;
  setIsSelectedRoomVisible: (visible: boolean) => void;
  joinedTable: (tableId: string) => void;
  isDealing: boolean;
  winners: any[];
  adminPreviewCards?: string[];
}

export default function SelectedRoom({
  selectedRoom,
  isSelectedRoomVisible,
  setIsSelectedRoomVisible,
  joinedTable,
  isDealing,
  winners,
}: SelectedRoomProps) {
  if (!selectedRoom || !isSelectedRoomVisible) return null;

  const { tableData } = selectedRoom;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="hidden lg:block bg-gray-800/80 backdrop-blur-md rounded-xl shadow-xl p-4 mb-6 w-full lg:w-1/3 flex-col h-full"
    >
      <div className="bg-gradient-to-r from-green-600 to-gray-900 rounded-lg p-4 mb-4 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-yellow-300">Ширээ: {selectedRoom.name}</h3>
          <p className="text-sm text-white">
            Блайнд: {tableData?.smallBlind || 0} / {tableData?.bigBlind || 0} | Мөнгөн дүн:{" "}
            {Number(tableData?.pot || 0).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="w-full mb-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Тоглогчид:</h4>
          {selectedRoom.players.length > 0 ? (
            <div className="space-y-2">
              {selectedRoom.players.map((player, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center text-sm text-white py-2 px-3 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-300">{player.flag}</span>
                    <span className="font-medium">{player.username}</span>
                  </div>
                  <span className="text-green-400 font-semibold">₮{Number(player.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Тоглогч байхгүй байна</p>
          )}
        </div>
        <div className="w-full flex justify-center mb-4 flex-shrink-0 overflow-hidden">
          <div className="max-h-[300px] w-full">
            <PokerTableSVG
              scale={0.7}
              pot={Number(tableData?.pot || 0)}
              maxPlayers={tableData?.maxPlayers || 0}
              tableStatus={tableData?.status || "Unknown"}
              round={String(tableData?.round || "preflop")}
              players={tableData?.players || []}
              isDealing={isDealing}
              winners={winners}
              onSeatClick={(seatId: any) => console.log(`Seat clicked: ${seatId}`)}
              isUserSeated={false}
              table={tableData}
            />
          </div>
        </div>
        <div className="w-full flex justify-between mb-4 flex-shrink-0 relative z-10">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSelectedRoomVisible(false)}
            className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition"
          >
            Хаах
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => joinedTable(selectedRoom.id)}
            className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition"
          >
            Суух
          </motion.button>
        </div>
        <div className="w-full mt-auto flex-shrink-0 relative z-10">
          <Image src={gift} alt="Animated GIF" width={300} height={100} className="w-full h-auto rounded-lg" priority />
        </div>
      </div>
    </motion.div>
  );
}