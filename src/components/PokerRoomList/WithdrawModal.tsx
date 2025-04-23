import React, { useEffect } from "react";
import { motion } from "framer-motion";

interface WithdrawModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  withdrawAmount: number;
  setWithdrawAmount: (amount: number) => void;
  bankType: string;
  setBankType: (type: string) => void;
  bankAccount: string;
  setBankAccount: (account: string) => void;
  userData: any;
  handleWithdraw: () => void;
}

export default function WithdrawModal({
  isOpen,
  setIsOpen,
  withdrawAmount,
  setWithdrawAmount,
  bankType,
  setBankType,
  bankAccount,
  setBankAccount,
  userData,
  handleWithdraw,
}: WithdrawModalProps) {
  useEffect(() => {
    if (userData?.bankType) setBankType(userData.bankType);
    if (userData?.bankAccount) setBankAccount(userData.bankAccount);
  }, [userData, setBankType, setBankAccount]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg border-2 border-yellow-600 w-11/12 max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Мөнгө татах</h2>
        <p className="text-gray-300 mb-4">Нийт мөнгө: {(Number(userData?.amount) || 0).toLocaleString()} ₮</p>
        <input
          type="number"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(Number(e.target.value))}
          min={1}
          max={Number(userData?.amount) || 0}
          className="w-full p-2 mb-4 bg-gray-700 text-white rounded-lg border border-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          placeholder="Enter amount to withdraw"
        />
        <input
          type="text"
          value={bankType}
          onChange={(e) => setBankType(e.target.value)}
          className="w-full p-2 mb-4 bg-gray-700 text-white rounded-lg border border-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          placeholder="Enter bank type"
        />
        <input
          type="text"
          value={bankAccount}
          onChange={(e) => setBankAccount(e.target.value)}
          className="w-full p-2 mb-4 bg-gray-700 text-white rounded-lg border border-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          placeholder="Enter bank account number"
        />
        <div className="flex justify-between">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsOpen(false);
              setWithdrawAmount(0);
              setBankType(userData?.bankType || "");
              setBankAccount(userData?.bankAccount || "");
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Үгүй
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleWithdraw}
            disabled={
              withdrawAmount <= 0 ||
              withdrawAmount > Number(userData?.amount || 0) ||
              !bankType.trim() ||
              !bankAccount.trim()
            }
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-500 disabled:opacity-50"
          >
            Татах
          </motion.button>
        </div>
      </div>
    </div>
  );
}