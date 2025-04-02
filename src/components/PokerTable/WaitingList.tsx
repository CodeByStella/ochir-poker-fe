"use client";
import { useState } from "react";
import { ITable } from "../../app/(private)/table/[id]/page";

interface WaitinglistProps {
  table?: ITable;
}

export default function Waitinglist({ table }: WaitinglistProps) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const [isWaitingListOpen, setIsWaitingListOpen] = useState(false);

  const toggleWaitingList = () => {
    setIsWaitingListOpen((prev) => !prev);
  };

  return (
    <>
      {isMobile ? (
        <div className="fixed bottom-0 right-0 p-2 flex flex-col items-start h-[15%]">
          <div className="flex flex-col space-y-2">
            <div
              className="w-10 h-10 flex items-center justify-center rounded-md cursor-pointer"
              onClick={toggleWaitingList}
            >
              <img
                src="/poker/waitinglist.svg"
                alt="waiting"
                className="w-full h-full bg-[#49499E] rounded-md"
              />
            </div>
            <div className="w-10 h-10 flex items-center justify-center rounded-md relative">
              <img
                src="/poker/queue.svg"
                alt="queue"
                className="w-full h-full bg-[#49499E] rounded-md"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 right-0 p-2 flex flex-col items-start h-[20%]">
          <div className="flex flex-col space-y-2">
            <div
              className="w-20 h-12 flex items-center justify-center rounded-lg cursor-pointer"
              onClick={toggleWaitingList}
            >
              <img
                src="/poker/waitinglist.svg"
                alt="Chat Table"
                className="w-full h-full bg-[#49499E] rounded-md"
              />
            </div>
            <div className="w-20 h-12 flex items-center justify-center rounded-lg relative">
              <img
                src="/poker/queue.svg"
                alt="Chat Lobby"
                className="w-full h-full rounded-md bg-[#49499E]"
              />
            </div>
          </div>
        </div>
      )}

      {isWaitingListOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-11/12 max-w-md text-center border-2 border-yellow-600">
            <h3 className="text-xl font-bold text-white mb-4">Тоглогчид</h3>
            {table?.players.length ? (
              <ul className="space-y-3 max-h-[60vh] overflow-y-auto">
                {table.players.map((player) => (
                  <li key={player._id} className="flex items-center gap-3 justify-center">
                    <span className="font-semibold text-white">{player.username}</span>
                    <span className="text-gray-300">({player.chips} chips)</span>
                    <span className="text-sm text-gray-400">Seat {player.seat}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-300 mb-4">Тоглогч байхгүй байна.</p>
            )}
            <button
              onClick={() => setIsWaitingListOpen(false)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Хаах
            </button>
          </div>
        </div>
      )}
    </>
  );
}