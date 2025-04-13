import React, { memo, SetStateAction, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ITable } from "@/models/table";
import { IPlayer } from "@/models/player";

interface Props {
  isRaiseOpen: boolean;
  setIsRaiseOpen: (open: boolean) => void;
  isMobile: boolean;
  raiseAmount: number;
  setRaiseAmount: (value: SetStateAction<number>) => void;
  table: ITable;
  currentPlayer: IPlayer;
  gameAction: (action: string, amount?: number) => void;
}

const ButtonNav = memo(
  ({
    isRaiseOpen,
    setIsRaiseOpen,
    isMobile,
    raiseAmount,
    setRaiseAmount,
    table,
    currentPlayer,
    gameAction,
  }: Props) => {
    const [inputValue, setInputValue] = useState(raiseAmount.toString());
    const [debouncedRaiseAmount, setDebouncedRaiseAmount] = useState(raiseAmount);
    const [showButtons, setShowButtons] = useState(true);

    // Sync inputValue when raiseAmount changes externally
    useEffect(() => {
      setInputValue(raiseAmount.toString());
    }, [raiseAmount]);

    // Debounce slider changes
    useEffect(() => {
      const handler = setTimeout(() => {
        setRaiseAmount(debouncedRaiseAmount);
      }, 50); // 50ms debounce delay
      return () => clearTimeout(handler);
    }, [debouncedRaiseAmount, setRaiseAmount]);

    // Reset button visibility when game state changes
    useEffect(() => {
      setShowButtons(true);
    }, [table.currentBet, currentPlayer.currentBet, table.round]);

    const adjustRaiseValue = useCallback(
      (increment: boolean) => {
        setDebouncedRaiseAmount((prev) => {
          const step = table.bigBlind; // Use bigBlind for consistent increments
          const newValue = increment ? prev + step : prev - step;
          const minRaise = table.currentBet + table.bigBlind;
          const maxRaise = currentPlayer.chips;
          const roundedValue = Math.round(newValue);
          return Math.max(minRaise, Math.min(roundedValue, maxRaise));
        });
      },
      [table.currentBet, table.bigBlind, currentPlayer.chips]
    );

    const calculateRaiseAmount = useCallback(
      (percentage: number) => {
        const minRaise = table.currentBet + table.bigBlind;
        const maxRaise = currentPlayer.chips;
        let calculatedAmount = table.currentBet * (percentage / 100) + table.pot;
        calculatedAmount = Math.max(minRaise, calculatedAmount);
        calculatedAmount = Math.min(maxRaise, calculatedAmount);
        calculatedAmount = Math.round(calculatedAmount);
        setDebouncedRaiseAmount(calculatedAmount);
        setInputValue(calculatedAmount.toString());
      },
      [table.currentBet, table.pot, table.bigBlind, currentPlayer.chips]
    );

    const calculatePotRaise = useCallback(() => {
      const minRaise = table.currentBet + table.bigBlind;
      const maxRaise = currentPlayer.chips;
      const potSize = table.pot + table.currentBet;
      let calculatedAmount = potSize + table.currentBet;
      calculatedAmount = Math.max(minRaise, calculatedAmount);
      calculatedAmount = Math.min(maxRaise, calculatedAmount);
      calculatedAmount = Math.round(calculatedAmount);
      setDebouncedRaiseAmount(calculatedAmount);
      setInputValue(calculatedAmount.toString());
    }, [table.currentBet, table.pot, table.bigBlind, currentPlayer.chips]);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
      },
      []
    );

    const handleInputBlur = useCallback(() => {
      const value = Number(inputValue);
      const minRaise = table.currentBet + table.bigBlind;
      const maxRaise = currentPlayer.chips;
      if (!isNaN(value)) {
        const roundedValue = Math.round(value);
        if (roundedValue < minRaise) {
          setDebouncedRaiseAmount(minRaise);
          setRaiseAmount(minRaise);
          setInputValue(minRaise.toString());
        } else if (roundedValue > maxRaise) {
          setDebouncedRaiseAmount(maxRaise);
          setRaiseAmount(maxRaise);
          setInputValue(maxRaise.toString());
        } else {
          setDebouncedRaiseAmount(roundedValue);
          setRaiseAmount(roundedValue);
          setInputValue(roundedValue.toString());
        }
      } else {
        setInputValue(raiseAmount.toString());
      }
    }, [inputValue, table.currentBet, table.bigBlind, currentPlayer.chips, raiseAmount, setRaiseAmount]);

    const handleKeyPress = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          handleInputBlur();
        }
      },
      [handleInputBlur]
    );

    const handleSliderChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        setDebouncedRaiseAmount(value);
        setInputValue(value.toString());
      },
      []
    );

    const highestPlayerBet = Math.max(
      ...table.players.map((player) => player.currentBet || 0)
    );

    const isFacingHigherAllIn =
      table.currentBet > currentPlayer.currentBet &&
      highestPlayerBet > currentPlayer.chips &&
      highestPlayerBet === table.currentBet;

    // Wrapper for gameAction to hide buttons after action
    const handleGameAction = useCallback(
      (action: string, amount?: number) => {
        gameAction(action, amount);
        setShowButtons(false);
      },
      [gameAction]
    );

    return (
      <>
        <AnimatePresence>
          {showButtons && (
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
                    className="flex-1 mx-1 py-2 text-white rounded-2xl border-2 border-blue-500 text-sm hover:bg-blue-500/20 transition-colors"
                  >
                    <span className="font-semibold">25%</span>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => calculateRaiseAmount(50)}
                    className="flex-1 mx-1 py-2 text-white rounded-2xl border-2 border-blue-500 text-sm hover:bg-blue-500/20 transition-colors"
                  >
                    <span className="font-semibold">50%</span>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => calculateRaiseAmount(75)}
                    className="flex-1 mx-1 py-2 text-white rounded-2xl border-2 border-blue-500 text-sm hover:bg-blue-500/20 transition-colors"
                  >
                    <span className="font-semibold">75%</span>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={calculatePotRaise}
                    className="flex-1 mx-1 py-2 text-white rounded-2xl border-2 border-blue-500 text-sm hover:bg-blue-500/20 transition-colors"
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
                    className="p-2 text-white bg-gray-900 rounded-full hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-lg font-semibold">-</span>
                  </motion.button>
                  <input
                    type="range"
                    min={table.currentBet + table.bigBlind}
                    max={currentPlayer.chips}
                    value={debouncedRaiseAmount}
                    onChange={handleSliderChange}
                    step="1"
                    className="flex-1 mx-2 w-full h-2 bg-gray-600 rounded-full cursor-pointer accent-yellow-600 transition-all duration-200"
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => adjustRaiseValue(true)}
                    className="p-2 text-white bg-gray-900 rounded-full hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-lg font-semibold">+</span>
                  </motion.button>
                  <input
                    type="number"
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    onKeyPress={handleKeyPress}
                    min={table.currentBet + table.bigBlind}
                    max={currentPlayer.chips}
                    step="1"
                    className="text-white font-bold text-sm md:text-base bg-gray-900 border border-gray-700 rounded-md text-center w-20 p-1 focus:outline-none focus:ring-2 focus:ring-yellow-600"
                  />
                </div>
              )}

              <div className="flex justify-around items-center w-full">
                <motion.button
                  onClick={() => handleGameAction("fold")}
                  whileTap={{ scale: 0.9 }}
                  className="flex-1 mx-1 py-2 flex flex-col items-center text-white border-red-500 border-2 rounded-2xl text-sm md:text-base min-w-[60px] hover:bg-red-500/20 transition-colors"
                >
                  <span className="font-semibold">Fold</span>
                </motion.button>

                {currentPlayer.currentBet === table.currentBet && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleGameAction("check")}
                    className="flex-1 mx-1 py-2 flex flex-col items-center border-green-500 border-2 text-white rounded-2xl text-sm md:text-base min-w-[60px] hover:bg-green-500/20 transition-colors"
                  >
                    <span className="font-semibold">Check</span>
                  </motion.button>
                )}

                {table.currentBet > currentPlayer.currentBet && table.currentBet >= 0 && !isFacingHigherAllIn && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleGameAction("call")}
                    className="flex-1 mx-1 py-2 flex flex-col items-center text-white rounded-2xl border-2 border-blue-500 text-sm md:text-base min-w-[80px] hover:bg-blue-500/20 transition-colors"
                  >
                    <span className="font-semibold">
                      Call ({(table.currentBet - currentPlayer.currentBet).toLocaleString()})
                    </span>
                  </motion.button>
                )}

                {isFacingHigherAllIn && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleGameAction("allin")}
                    className="flex-1 mx-1 py-2 flex flex-col items-center text-white rounded-2xl border-2 border-purple-500 text-sm md:text-base min-w-[80px] hover:bg-purple-500/20 transition-colors"
                  >
                    <span className="font-semibold">All In ({currentPlayer.chips.toLocaleString()})</span>
                  </motion.button>
                )}

                {!isFacingHigherAllIn && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleGameAction("allin")}
                    className="flex-1 mx-1 py-2 flex flex-col items-center text-white rounded-2xl border-2 border-purple-500 text-sm md:text-base min-w-[60px] hover:bg-purple-500/20 transition-colors"
                  >
                    <span className="font-semibold">All In</span>
                  </motion.button>
                )}

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => (isMobile ? setIsRaiseOpen(!isRaiseOpen) : handleGameAction("raise", raiseAmount))}
                  className="flex-1 mx-1 py-2 flex flex-col items-center text-white rounded-2xl border-blue-500 border-2 text-sm md:text-base min-w-[60px] hover:bg-blue-500/20 transition-colors"
                >
                  <span className="font-semibold">Raise</span>
                </motion.button>
              </div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isMobile && isRaiseOpen && showButtons && (
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed bottom-0 left-0 right-0 h-[45%] bg-gray-800/80 backdrop-blur-md p-6 flex flex-col justify-between items-center shadow-lg z-40 rounded-t-lg"
            >
              <div className="flex flex-col items-center w-full gap-2">
                <input
                  type="number"
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  onKeyPress={handleKeyPress}
                  min={table.currentBet + table.bigBlind}
                  max={currentPlayer.chips}
                  step="1"
                  className="text-white font-bold text-sm md:text-base bg-gray-900 border border-gray-700 rounded-md text-center w-20 p-1 focus:outline-none focus:ring-2 focus:ring-yellow-600"
                />
                <div className="relative w-full flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => adjustRaiseValue(false)}
                    className="p-2 text-white bg-gray-900 rounded-full hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-lg font-semibold">-</span>
                  </motion.button>
                  <input
                    type="range"
                    min={table.currentBet + table.bigBlind}
                    max={currentPlayer.chips}
                    value={debouncedRaiseAmount}
                    onChange={handleSliderChange}
                    step="1"
                    className="flex-1 mx-2 w-full h-2 bg-gray-600 rounded-full cursor-pointer accent-yellow-600 transition-all duration-200"
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => adjustRaiseValue(true)}
                    className="p-2 text-white bg-gray-900 rounded-full hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-lg font-semibold">+</span>
                  </motion.button>
                </div>

                <div className="flex justify-around w-full mb-4">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => calculateRaiseAmount(25)}
                    className="px-4 py-2 text-white bg-gray-900 rounded-2xl border-2 border-blue-500 hover:bg-blue-500/20 transition-colors"
                  >
                    <span className="text-sm font-semibold">25%</span>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => calculateRaiseAmount(50)}
                    className="px-4 py-2 text-white bg-gray-900 rounded-2xl border-2 border-blue-500 hover:bg-blue-500/20 transition-colors"
                  >
                    <span className="text-sm font-semibold">50%</span>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => calculateRaiseAmount(75)}
                    className="px-4 py-2 text-white bg-gray-900 rounded-2xl border-2 border-blue-500 hover:bg-blue-500/20 transition-colors"
                  >
                    <span className="text-sm font-semibold">75%</span>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={calculatePotRaise}
                    className="px-4 py-2 text-white bg-gray-900 rounded-2xl border-2 border-blue-500 hover:bg-blue-500/20 transition-colors"
                  >
                    <span className="text-sm font-semibold">Pot</span>
                  </motion.button>
                </div>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    handleGameAction("raise", raiseAmount);
                    setIsRaiseOpen(false);
                  }}
                  disabled={raiseAmount <= table.currentBet}
                  className="w-full px-4 py-2 text-white border-2 mb-[15px] border-gray-500 rounded-lg disabled:opacity-50 text-sm md:text-base hover:bg-gray-500/20 transition-colors"
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
);

ButtonNav.displayName = "ButtonNav";

export default ButtonNav;