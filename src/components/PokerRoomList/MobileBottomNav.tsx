import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MobileBottomNavProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  isCassOpen: boolean;
  setIsCassOpen: (open: boolean) => void;
  lobbyMessages: any[];
}

export default function MobileBottomNav({
  isSidebarOpen,
  setIsSidebarOpen,
  isChatOpen,
  setIsChatOpen,
  isCassOpen,
  setIsCassOpen,
  lobbyMessages,
}: MobileBottomNavProps) {
  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-md p-2 flex justify-around items-center shadow-lg z-50">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7m-9 9v-6h6v6m-9-6h12" />
          </svg>
          <span className="text-xs">Үндсэн дэлгэц</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center text-white"
          onClick={() => setIsCassOpen(!isCassOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.104 0-2 .896-2 2s.896 2 2 2 2-.896 2-2-.896-2-2-2zm0-4c-3.313 0-6 2.687-6 6s2.687 6 6 6 6-2.687 6-6-2.687-6-6-6z" />
          </svg>
          <span className="text-xs">Мөнгөний Касс</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center text-white"
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h8m-8 4h8m-8-8h8m-4 12h-6a2 2 0 01-2-2V6a2 2 0 012-2h6" />
          </svg>
          <span className="text-xs">Чат</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center text-white"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
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
            className="lg:hidden fixed bottom-0 left-0 right-0 h-1/2 bg-gray-900 backdrop-blur-md p-6 flex flex-col justify-between items-center shadow-lg z-40"
          >
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              Cass coming soon
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}