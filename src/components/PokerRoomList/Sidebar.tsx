import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { CopyOutlined, LogoutOutlined, WalletOutlined, LoginOutlined, BankOutlined } from "@ant-design/icons";
import { IBank } from "@/models/bank";

interface SidebarProps {
  userData: any;
  logOut: () => void;
  setIsWithdrawModalOpen: (open: boolean) => void;
  setIsLoginModalOpen: (open: boolean) => void;
  isSidebarOpen: boolean;
  bankData?: IBank[];
  bankError?: any;
}

interface BankModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  bankData?: IBank[];
  bankError?: any;
}

interface CopyableBankNumberProps {
  number: string;
}

function CopyableBankNumber({ number }: CopyableBankNumberProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className="inline-flex items-center text-yellow-400">
      {number}
      <span className="relative ml-2">
        <svg
          className="w-5 h-5 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          onClick={handleCopy}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        {copied && (
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded">
            Copied!
          </span>
        )}
      </span>
    </span>
  );
}

function BankModal({ isOpen, setIsOpen, bankData, bankError }: BankModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-gray-800 p-6 rounded-lg shadow-lg w-11/12 max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-4">Гүйлгээний утга дээр өөрийн нэрээ бичин шилжүүлнэ үү!</h2>
            <div className="space-y-4">
              {bankData ? (
                bankData.map((bank, index) => (
                  <div key={index} className="text-white">
                    <p>
                      <span className="font-semibold">Данс төрөл:{" "}</span>{" "}
                      <span className="text-green-400">{bank.bankType}</span>
                    </p>
                    <p className="text-lg font-medium text-white">
                      Цэнэглэлт хийх данс:{" "}
                      <CopyableBankNumber number={String(bank.bankAccount)} />
                    </p>
                  </div>
                ))
              ) : bankError ? (
                <p className="text-red-400">Failed to load bank data</p>
              ) : (
                <p className="text-gray-400">Loading bank data...</p>
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mt-6 w-full bg-gradient-to-r from-gray-700 to-gray-600 text-white py-2 rounded-lg shadow-md"
              onClick={() => setIsOpen(false)}
            >
              Хаах
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Sidebar({
  userData,
  logOut,
  setIsWithdrawModalOpen,
  setIsLoginModalOpen,
  isSidebarOpen,
  bankData,
  bankError,
}: SidebarProps) {
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col items-center h-full w-full">
      <div className="flex flex-col items-center space-y-4">
        <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
          <Image
            src="/profile2.png"
            alt="Avatar"
            width={100}
            height={100}
            className="rounded-full border-4 border-yellow-300 shadow-md"
          />
        </motion.div>
        <div className="w-full space-y-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="w-full bg-gradient-to-r from-gray-700 to-gray-600 text-white py-3 rounded-lg flex justify-between items-center px-4 font-bold shadow-md text-sm"
          >
            {userData?.name || "Guest"}
            <div className="bg-blue-600 text-white p-2 rounded-full">
              <CopyOutlined style={{ fontSize: "16px" }} />
            </div>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="w-full bg-gradient-to-r from-blue-700 to-indigo-700 text-white py-3 rounded-lg shadow-md flex justify-between items-center px-4 text-sm"
          >
            <span className="mr-2">₮ {userData?.amount || "0"} </span>
            {userData?._id && (
              <WalletOutlined
                style={{ fontSize: "20px" }}
                onClick={() => setIsWithdrawModalOpen(true)}
                className="cursor-pointer hover:text-yellow-300"
              />
            )}
          </motion.button>
        </div>
      </div>

      <div className="flex-grow" />

      <div className="w-full space-y-4 pb-10">
        {userData?._id && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="hidden lg:block w-full bg-gradient-to-r from-yellow-700 to-yellow-600 text-white py-3 rounded-lg justify-center items-center shadow-md text-sm" // Hidden on mobile, visible on lg+
            onClick={() => setIsBankModalOpen(true)}
          >
            <BankOutlined className="mr-2" /> Цэнэглэлт
          </motion.button>
        )}
        {userData?._id ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full bg-gradient-to-r from-red-700 to-red-600 text-white py-3 rounded-lg flex justify-center items-center shadow-md text-sm"
            onClick={logOut}
          >
            <LogoutOutlined className="mr-2" /> Гарах
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full bg-gradient-to-r from-green-700 to-green-600 text-white py-3 rounded-lg flex justify-center items-center shadow-md text-sm"
            onClick={() => setIsLoginModalOpen(true)}
          >
            <LoginOutlined className="mr-2" /> Нэвтрэх
          </motion.button>
        )}
        <div className="text-center text-gray-400 text-sm">
          {new Date().toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <motion.div
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="hidden lg:flex lg:flex-col lg:w-72 h-screen bg-gray-900 backdrop-blur-md p-6 shadow-lg"
      >
        <SidebarContent />
      </motion.div>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "tween", duration: 0.3 }}
            className="lg:hidden fixed inset-y-0 right-0 w-72 bg-gray-900 backdrop-blur-md p-6 flex flex-col items-center shadow-lg z-40"
          >
            <SidebarContent />
          </motion.div>
        )}
      </AnimatePresence>
      <BankModal
        isOpen={isBankModalOpen}
        setIsOpen={setIsBankModalOpen}
        bankData={bankData}
        bankError={bankError}
      />
    </>
  );
}