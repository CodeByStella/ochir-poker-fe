import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { CopyOutlined, LogoutOutlined, WalletOutlined, LoginOutlined } from "@ant-design/icons";

interface SidebarProps {
  userData: any;
  logOut: () => void;
  setIsWithdrawModalOpen: (open: boolean) => void;
  setIsLoginModalOpen: (open: boolean) => void;
  isSidebarOpen: boolean;
}

export default function Sidebar({ userData, logOut, setIsWithdrawModalOpen, setIsLoginModalOpen, isSidebarOpen }: SidebarProps) {
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
    </>
  );
}