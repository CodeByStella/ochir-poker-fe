import { ITable } from '@/models/table';
import { IUser } from '@/models/user';
import React, { memo, SetStateAction, useState } from 'react';

type Props = {
  table: ITable;
  chipAmount: number;
  setChipAmount: (value: SetStateAction<number>) => void;
  currentUser?: IUser;
  joinSeat: (seat: number, chips: number) => void;
  closeModal: () => void;
  selectedSeat: number | null;
};

const SeatModal = memo(
  ({
    chipAmount,
    currentUser,
    joinSeat,
    setChipAmount,
    table,
    closeModal,
    selectedSeat,
  }: Props) => {
    const buyIn = table?.buyIn || 0;
    const maxBuyIn = table?.maxBuyIn || 0;
    const userAmount = currentUser?.amount || 0;
    const range = Math.min(maxBuyIn, userAmount) - buyIn;
    const isInsufficientFunds = userAmount < buyIn;
    const [inputValue, setInputValue] = useState(chipAmount.toString());

    const handlePercentageClick = (percentage: number) => {
      if (isInsufficientFunds) return;
      const newAmount = buyIn + (range * percentage) / 100;
      setChipAmount(newAmount);
      setInputValue(newAmount.toString());
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value); 
    };

    const handleInputBlur = () => {
      const value = Number(inputValue);
      if (!isNaN(value)) {
        if (value < buyIn) {
          setChipAmount(buyIn);
          setInputValue(buyIn.toString());
        } else if (value > Math.min(maxBuyIn, userAmount)) {
          const maxAllowed = Math.min(maxBuyIn, userAmount);
          setChipAmount(maxAllowed);
          setInputValue(maxAllowed.toString());
        } else {
          setChipAmount(value);
          setInputValue(value.toString());
        }
      } else {
        setInputValue(chipAmount.toString());
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleInputBlur();
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[1000]">
        <div className="bg-gray-800 p-6 rounded-lg w-11/12 max-w-md text-center border-2 border-yellow-600">
          <h2 className="text-xl font-bold text-white mb-4">
            Суудал {selectedSeat}
          </h2>
          <p className="text-gray-300 mb-4">
            Ширээнд суух хамгийн бага дүн: {buyIn.toLocaleString()} ₮
          </p>
          <p className="text-gray-300 mb-4">
            Ширээнд суух хамгийн их дүн: {maxBuyIn.toLocaleString()} ₮
          </p>
          <p className="text-gray-300 mb-4">
            Таны үлдэгдэл: {userAmount.toLocaleString()} ₮
          </p>

          {isInsufficientFunds && (
            <p className="text-red-500 mb-4">
              Таны үлдэгдэл хүрэлцэхгүй байна
            </p>
          )}

          <div className="flex flex-col items-center gap-4 w-full">
            <div className="flex flex-col items-center w-full gap-2">
              <input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyPress={handleKeyPress}
                min={buyIn}
                max={Math.min(maxBuyIn, userAmount)}
                step="0.1"
                disabled={isInsufficientFunds}
                className="w-2/3 p-2 bg-gray-700 text-white rounded-lg border border-gray-600 disabled:opacity-50 text-center"
              />
              <div className="flex items-center justify-between w-full gap-2">
                <span className="text-white font-bold text-sm md:text-base">
                  {chipAmount.toLocaleString()} ₮
                </span>
                <input
                  type="range"
                  value={chipAmount}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setChipAmount(value);
                    setInputValue(value.toString());
                  }}
                  min={buyIn}
                  max={Math.min(maxBuyIn, userAmount)}
                  step="0.1"
                  disabled={isInsufficientFunds}
                  className="w-full h-2 bg-gray-600 rounded-lg cursor-pointer disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex justify-center gap-3 w-full">
              <button
                onClick={() => handlePercentageClick(25)}
                disabled={isInsufficientFunds}
                className="px-3 py-1 border-2 border-blue-400 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                25%
              </button>
              <button
                onClick={() => handlePercentageClick(50)}
                disabled={isInsufficientFunds}
                className="px-3 py-1 border-2 border-blue-400 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                50%
              </button>
              <button
                onClick={() => handlePercentageClick(75)}
                disabled={isInsufficientFunds}
                className="px-3 py-1 border-2 border-blue-400 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                75%
              </button>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={closeModal}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Үгүй
            </button>
            <button
              onClick={() =>
                selectedSeat !== null && joinSeat(selectedSeat, chipAmount)
              }
              disabled={chipAmount < buyIn || isInsufficientFunds}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-500 disabled:opacity-50"
            >
              Тийм
            </button>
          </div>
        </div>
      </div>
    );
  }
);

SeatModal.displayName = 'SeatModal';

export default SeatModal;