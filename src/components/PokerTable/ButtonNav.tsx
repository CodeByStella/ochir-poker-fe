import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ITable } from "@/models/table";
import { IPlayer } from "@/models/player";

interface Props {
  isRaiseOpen: boolean;
  setIsRaiseOpen: (open: boolean) => void;
  isMobile: boolean;
  raiseAmount: number;
  setRaiseAmount: (value: React.SetStateAction<number>) => void;
  table: ITable;
  currentPlayer: IPlayer;
  gameAction: (action: string, amount?: number) => void;
}

export default function ButtonNav({
  isRaiseOpen,
  setIsRaiseOpen,
  isMobile,
  raiseAmount,
  setRaiseAmount,
  table,
  currentPlayer,
  gameAction,
}: Props) {
  const adjustRaiseValue = (increment: boolean) => {
    setRaiseAmount((prev) => {
      const step = table.bigBlind;
      const newValue = increment ? prev + step : prev - step;
      const minRaise = table.currentBet + table.bigBlind;
      const maxRaise = currentPlayer.chips;
      return Math.max(minRaise, Math.min(newValue, maxRaise));
    });
  };

  const calculateRaiseAmount = (percentage: number) => {
    const minRaise = table.currentBet + table.bigBlind;
    const maxRaise = currentPlayer.chips;
    let calculatedAmount = currentPlayer.chips * (percentage / 100);

    calculatedAmount = Math.max(minRaise, calculatedAmount);
    calculatedAmount = Math.min(maxRaise, calculatedAmount);
    calculatedAmount = Math.round(calculatedAmount / table.bigBlind) * table.bigBlind;

    setRaiseAmount(calculatedAmount);
    if (!isMobile) gameAction("raise", calculatedAmount); 
  };

  const calculatePotRaise = () => {
    const minRaise = table.currentBet + table.bigBlind;
    const maxRaise = currentPlayer.chips;
    const potSize = table.pot + table.currentBet;
    let calculatedAmount = potSize + table.currentBet;

    calculatedAmount = Math.max(minRaise, calculatedAmount);
    calculatedAmount = Math.min(maxRaise, calculatedAmount);
    calculatedAmount = Math.round(calculatedAmount / table.bigBlind) * table.bigBlind;

    setRaiseAmount(calculatedAmount);
    if (!isMobile) gameAction("raise", calculatedAmount); 
  };

  return (
    <>
      <div
        className={`${
          isMobile
            ? "fixed bottom-0 left-0 right-0 p-2"
            : "fixed bottom-4 right-24 w-[30%] p-4"
        } shadow-lg z-50 bg-transparent rounded-lg flex flex-col gap-4`}
      >
        {!isMobile && (
          <div className="flex justify-around w-full">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => calculateRaiseAmount(25)}
              className="flex-1 mx-1 py-2 text-white rounded-2xl border-2 border-blue-500 text-sm"
            >
              <span className="font-semibold">25%</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => calculateRaiseAmount(50)}
              className="flex-1 mx-1 py-2 text-white rounded-2xl border-2 border-blue-500 text-sm"
            >
              <span className="font-semibold">50%</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => calculateRaiseAmount(75)}
              className="flex-1 mx-1 py-2 text-white rounded-2xl border-2 border-blue-500 text-sm"
            >
              <span className="font-semibold">75%</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={calculatePotRaise}
              className="flex-1 mx-1 py-2 text-white  rounded-2xl border-2 border-blue-500 text-sm"
            >
              <span className="font-semibold">Pot</span>
            </motion.button>
          </div>
        )}

        {!isMobile && (
          <div className="relative w-full flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => adjustRaiseValue(false)}
              className="p-2 text-white bg-gray-900 rounded-full"
            >
              <span className="text-lg font-semibold">-</span>
            </motion.button>
            <input
              type="range"
              min={table.currentBet + table.bigBlind}
              max={currentPlayer.chips}
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(Number(e.target.value))}
              step={table.bigBlind}
              className="flex-1 mx-2 w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => adjustRaiseValue(true)}
              className="p-2 text-white bg-gray-900 rounded-full"
            >
              <span className="text-lg font-semibold">+</span>
            </motion.button>
            <span className="text-white font-bold text-sm">
              {raiseAmount.toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex justify-around items-center w-full">
          <motion.button
            onClick={() => gameAction("fold")}
            whileTap={{ scale: 0.9 }}
            className="flex-1 mx-1 py-2 flex flex-col items-center text-white border-red-500 border-2 rounded-2xl text-sm md:text-base min-w-[60px]"
          >
            <span className="font-semibold">Fold</span>
          </motion.button>

          {currentPlayer.currentBet === table.currentBet && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => gameAction("check")}
              className="flex-1 mx-1 py-2 flex flex-col items-center border-green-500 border-2 text-white rounded-2xl text-sm md:text-base min-w-[60px]"
            >
              <span className="font-semibold">Check</span>
            </motion.button>
          )}

        {table.currentBet > currentPlayer.currentBet && table.currentBet > 0 && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => gameAction("call")}
            className="flex-1 mx-1 py-2 flex flex-col items-center text-white rounded-2xl border-2 border-blue-500 text-sm md:text-base min-w-[80px]"
          >
            <span className="font-semibold">
              Call ({(table.currentBet - currentPlayer.currentBet).toFixed(2)})
            </span>
          </motion.button>
        )}

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => gameAction("allin")}
            className="flex-1 mx-1 py-2 flex flex-col items-center text-white rounded-2xl border-2 border-purple-500 text-sm md:text-base min-w-[60px]"
          >
            <span className="font-semibold">All In</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => (isMobile ? setIsRaiseOpen(!isRaiseOpen) : gameAction("raise", raiseAmount))}
            className="flex-1 mx-1 py-2 flex flex-col items-center text-white rounded-2xl border-blue-500 border-2 text-sm md:text-base min-w-[60px]"
          >
            <span className="font-semibold">Raise</span>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {isMobile && isRaiseOpen && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 h-1/3 bg-gray-800/80 backdrop-blur-md p-6 flex flex-col justify-between items-center shadow-lg z-40 rounded-t-lg"
          >
            <div className="flex flex-col items-center w-full gap-2">
              <span className="text-white font-bold text-sm md:text-base">
                {raiseAmount.toFixed(2)}
              </span>
              <div className="relative w-full flex items-center">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => adjustRaiseValue(false)}
                  className="p-2 text-white bg-gray-900 rounded-full"
                >
                  <span className="text-lg font-semibold">-</span>
                </motion.button>

                <input
                  type="range"
                  min={table.currentBet + table.bigBlind}
                  max={currentPlayer.chips}
                  value={raiseAmount}
                  onChange={(e) => setRaiseAmount(Number(e.target.value))}
                  step={table.bigBlind}
                  className="flex-1 mx-2 w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => adjustRaiseValue(true)}
                  className="p-2 text-white bg-gray-900 rounded-full"
                >
                  <span className="text-lg font-semibold">+</span>
                </motion.button>
              </div>

              <div className="flex justify-around w-full mb-4">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => calculateRaiseAmount(25)}
                  className="px-4 py-2 text-white bg-gray-900 rounded-2xl border-2 border-blue-500"
                >
                  <span className="text-sm font-semibold">25%</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => calculateRaiseAmount(50)}
                  className="px-4 py-2 text-white bg-gray-900 rounded-2xl border-2 border-blue-500"
                >
                  <span className="text-sm font-semibold">50%</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => calculateRaiseAmount(75)}
                  className="px-4 py-2 text-white bg-gray-900 rounded-2xl border-2 border-blue-500"
                >
                  <span className="text-sm font-semibold">75%</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={calculatePotRaise}
                  className="px-4 py-2 text-white bg-gray-900 rounded-2xl border-2 border-blue-500"
                >
                  <span className="text-sm font-semibold">Pot</span>
                </motion.button>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  gameAction("raise", raiseAmount);
                  setIsRaiseOpen(false);
                }}
                disabled={raiseAmount <= table.currentBet}
                className="w-full px-4 py-2 text-white border-2 border-gray-500 rounded-lg disabled:opacity-50 text-sm md:text-base"
              >
                <span className="font-semibold">Raise</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}