/* eslint-disable @next/next/no-img-element */
"use client";
import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react"; 
import { motion, AnimatePresence } from "framer-motion";
import { Socket } from "socket.io-client";
import { IUser } from "@/models/user";
import { IMessage } from "@/models/poker";

interface Message {
  chatType: "table" | "lobby";
  user: { _id: string; name: string };
  content: string;
  timestamp: Date;
}

interface ChatComponentProps {
  socket: Socket<any, any> | null
  tableId: string;
  currentUser?: IUser | null;
  messages: {
    table: IMessage[];
    lobby: IMessage[];
};
}

export default function ChatComponent({ socket, tableId, currentUser, messages, }: ChatComponentProps) {
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"table" | "lobby">("table");

  const [messageInput, setMessageInput] = useState<string>("");
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  
  // Create a ref for the messages container
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Function to scroll to the bottom of the messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };
  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    if (!messageInput.trim() || !currentUser || !socket) return;

    socket.emit("sendMessage", {
      lobbyId: tableId,
      userId: currentUser._id,
      content: messageInput,
      chatType: activeTab,
    });

    setMessageInput("");
    // Scroll to bottom after sending a message
    scrollToBottom();
  };

  const renderMessages = (chatType: "table" | "lobby") => {
    return (
      <>
        {messages[chatType].map((msg, index) => (
          <div key={index} className="text-white p-2">
            <span className="font-bold">{msg.user.name}: </span>
            <span>{msg.content}</span>
            <span className="text-gray-400 text-xs ml-2">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
        {/* Dummy div for scrolling to the bottom */}
        <div ref={messagesEndRef} />
      </>
    );
  };

  return (
    <>
      {isMobile ? (
        <div className="fixed bottom-10 left-0 w-[30%] p-2 flex flex-col items-start h-[15%]">
          <div className="flex flex-col space-y-2">
            <div
              className={`w-10 h-10 flex items-center justify-center rounded-md cursor-pointer ${
                activeTab === "table" ? "opacity-100" : "opacity-100"
              }`}
              onClick={() => {
                setIsChatOpen(true);
                setActiveTab("table");
              }}
            >
              <img
                src="/poker/chattable.svg"
                alt="Chat Table"
                className="w-full h-full bg-blue-500"
              />
            </div>
            <div
              className={`w-10 h-10 flex items-center justify-center rounded-md relative cursor-pointer ${
                activeTab === "lobby" ? "opacity-100" : "opacity-100"
              }`}
              onClick={() => {
                setIsChatOpen(true);
                setActiveTab("lobby");
              }}
            >
              <img
                src="/poker/chatlobby.svg"
                alt="Chat Lobby"
                className="w-full h-full bg-red-500"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 w-[30%] bg-gray-800 p-2 flex flex-col">
          <div className="flex items-start justify-between">
            <div className="flex space-x-2">
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-md cursor-pointer ${
                  activeTab === "table" ? "opacity-100" : "opacity-50"
                }`}
                onClick={() => {
                  setIsChatOpen(true);
                  setActiveTab("table");
                }}
              >
                <img
                  src="/poker/chattable.svg"
                  alt="Chat Table"
                  className="w-full h-full bg-blue-500"
                />
              </div>
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-md relative cursor-pointer ${
                  activeTab === "lobby" ? "opacity-100" : "opacity-50"
                }`}
                onClick={() => {
                  setIsChatOpen(true);
                  setActiveTab("lobby");
                }}
              >
                <img
                  src="/poker/chatlobby.svg"
                  alt="Chat Lobby"
                  className="w-full h-full bg-red-500"
                />
              </div>
            </div>
            <div className="flex flex-1 justify-center">
              <button onClick={() => setIsChatOpen((prev) => !prev)}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="white"
                  className="w-6 h-6"
                >
                  <path d="M12 4l-6 6h12l-6-6zm0 16l6-6H6l6 6z" />
                </svg>
              </button>
            </div>
          </div>
          <AnimatePresence>
            {isChatOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "30vh", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "tween", duration: 0.3 }}
                className="flex flex-col bg-gray-900 rounded-md overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto p-2">
                  {renderMessages(activeTab)}
                </div>
                {currentUser && (
                  <div className="p-2 border-t border-gray-700">
                    {activeTab === "lobby" && currentUser.role !== "admin" ? (
                      <p className="text-gray-400 text-sm">🔒 👑</p>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                          className="flex-1 p-2 bg-gray-700 text-white rounded"
                          placeholder="Type a message..."
                        />
                        <button
                          onClick={sendMessage}
                          className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700"
                        >
                          Send
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {isChatOpen && isMobile && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "tween", duration: 0.3 }}
            className="lg:hidden fixed bottom-0 left-0 right-0 h-1/2 bg-gray-900 backdrop-blur-md flex flex-col shadow-lg z-50"
          >
            <div className="w-full bg-gray-900 p-4 flex justify-start items-center space-x-4 border-b border-gray-700 z-60">
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-md relative cursor-pointer ${
                  activeTab === "table" ? "opacity-100" : "opacity-50"
                }`}
                onClick={() => setActiveTab("table")}
              >
                <img
                  src="/poker/chattable.svg"
                  alt="Chat Table"
                  className="w-full h-full bg-blue-500 rounded-md"
                />
              </div>
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-md relative cursor-pointer ${
                  activeTab === "lobby" ? "opacity-100" : "opacity-50"
                }`}
                onClick={() => setActiveTab("lobby")}
              >
                <img
                  src="/poker/chatlobby.svg"
                  alt="Chat Lobby"
                  className="w-full h-full bg-red-500 rounded-md"
                />
              </div>
              <div className="flex flex-1 justify-center">
                <button onClick={() => setIsChatOpen(false)}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="white"
                    className="w-6 h-6"
                  >
                    <path d="M12 4l-6 6h12l-6-6zm0 16l6-6H6l6 6z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {renderMessages(activeTab)}
            </div>
            {currentUser && (
              <div className="p-2 border-t border-gray-700">
                {activeTab === "lobby" && currentUser.role !== "admin" ? (
                  <p className="text-gray-400 text-sm">🔒 👑</p>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      className="flex-1 p-2 bg-gray-700 text-white rounded"
                      placeholder="Type a message..."
                    />
                    <button
                      onClick={sendMessage}
                      className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700"
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}