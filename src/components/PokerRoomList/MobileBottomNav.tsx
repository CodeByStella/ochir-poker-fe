import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IBank } from "@/models/bank";
import { IUser } from "@/models/user";

interface MobileBottomNavProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  isCassOpen: boolean;
  setIsCassOpen: (open: boolean) => void;
  lobbyMessages: any[];
  bankData?: IBank[]; 
  bankError?: any;
  userData: any;
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

export default function MobileBottomNav({
  isSidebarOpen,
  setIsSidebarOpen,
  isChatOpen,
  setIsChatOpen,
  isCassOpen,
  setIsCassOpen,
  lobbyMessages,
  bankData,
  userData,
  bankError,
}: MobileBottomNavProps) {
  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-md p-2 flex justify-around items-center shadow-lg z-50">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center text-white"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 12l2-2m0 0l7-7 7 7m-9 9v-6h6v6m-9-6h12"
            />
          </svg>
          <span className="text-xs">Үндсэн дэлгэц</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center text-white"
          onClick={() => setIsCassOpen(!isCassOpen)}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8c-1.104 0-2 .896-2 2s.896 2 2 2 2-.896 2-2-.896-2-2-2zm0-4c-3.313 0-6 2.687-6 6s2.687 6 6 6 6-2.687 6-6-2.687-6-6-6z"
            />
          </svg>
          <span className="text-xs">Цэнэглэлт</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center text-white"
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 12h8m-8 4h8m-8-8h8m-4 12h-6a2 2 0 01-2-2V6a2 2 0 012-2h6"
            />
          </svg>
          <span className="text-xs">Чат</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center text-white"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16m-7 6h7"
            />
          </svg>
          <span className="text-xs">Цэс</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "tween", duration: 0.3 }}
            className="lg:hidden fixed bottom-0 left-0 right-0 h-1/2 bg-gray-900 backdrop-blur-md p-6 flex flex-col justify-between items-center shadow-lg z-40"
          >
            <div className="w-full h-full overflow-y-auto">
              {lobbyMessages.length > 0 ? (
                lobbyMessages.map((msg, index) => (
                  <div key={index} className="text-white mb-2">
                    <span className="font-bold">{msg.user.name}: </span>
                    <span>{msg.content}</span>
                    <span className="text-gray-400 text-xs ml-2">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-gray-400">No messages yet</div>
              )}
            </div>
          </motion.div>
        )}
        {isCassOpen && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "tween", duration: 0.3 }}
            className="lg:hidden fixed bottom-0 left-0 right-0 h-1/3 bg-gray-900 backdrop-blur-md p-6 flex flex-col justify-between items-center shadow-lg z-40"
          >
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 font-sans">
              {bankData ? (
                bankData.map((bank, index) => (
                  <div
                    key={index}
                    className="mb-6 p-4 bg-gray-800/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-700"
                  >
                    <p className="text-sm text-blue-300 mb-2 animate-pulse">
                      Гүйлгээний утга дээр өөрийн нэрээ бичин шилжүүлнэ үү!
                    </p>
                    <p className="text-lg font-medium text-white">
                      Данс төрөл:{" "}
                      <span className="text-green-400">{bank.bankType}</span>
                    </p>
                    <p className="text-lg font-medium text-white">
                      Цэнэглэлт хийх данс:{" "}
                      <CopyableBankNumber number={String(bank.bankAccount)} />
                    </p>
                    <p className="text-lg font-medium text-white">
                      Миний нэр:{" "}
                      <CopyableBankNumber number={String(userData?.name)} />
                    </p>
                  </div>
                ))
              ) : bankError ? (
                <p className="text-red-400 font-bold text-lg animate-bounce">
                  Failed to load bank data
                </p>
              ) : (
                <p className="text-gray-300 text-lg animate-pulse">
                  Loading bank data...
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}