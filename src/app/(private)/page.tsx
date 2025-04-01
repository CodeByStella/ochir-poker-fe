"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";
import io, { Socket } from "socket.io-client";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { message } from "@/utils/toast";
import { authApi } from "@/apis";
import { withdraw } from "@/apis/money";
import { ITable } from "@/models/lobby";
import { siteApi } from "@/config/site";
import {
  CopyOutlined,
  LogoutOutlined,
  WalletOutlined,
  LoginOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { logout } from "@/store/auth-slice";
import { useDispatch } from "react-redux";
import LoginModal from "@/components/modal/Login";
import { PokerTableSVG } from "./table/[id]/PokerTableSVG";
import gift from "../../../public/gift.gif"
const socket: Socket = io(`${siteApi}`, {
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 5, // Retry connection 5 times
  reconnectionDelay: 1000, // Delay between retries
});

interface IUser {
  _id: string;
  user: string;
  name: string;
  chips: number;
  seat: number;
  cards: [string, string];
  inHand: boolean;
  currentBet: number;
  hasActed: boolean;
  amount: string;
}

interface SelectedRoom {
  id: string;
  name: string;
  players: { username: string; flag: string; amount: string }[];
  tableData?: ITable;
}
interface WinnerData {
  playerId: string;
  chipsWon: number;
  handDescription?: string;
}

export default function PokerRoomList() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<"cash" | "tournament">("cash");
  const [gameType, setGameType] = useState<string>("All");
  const [lobbies, setLobbies] = useState<ITable[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<SelectedRoom | null>(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [isSelectedRoomVisible, setIsSelectedRoomVisible] = useState(true);
  const [winners, setWinners] = useState<WinnerData[]>([]);
  
  const { mutate } = useSWRConfig();

  const { data: userData } = useSWR<IUser>("swr.auth.me", async () => {
    const res = await authApi.me();
    return res;
  });

  const { data: swrLobbies, error: swrError } = useSWR<ITable[]>(
    "swr.lobby.list",
    async () => {
      const tables = await new Promise<ITable[]>((resolve) => {
        socket.emit("getLobbyList");
        socket.once("lobbyList", (lobbyList: ITable[]) => resolve(lobbyList));
      });
      return tables;
    },
    { refreshInterval: 5000 } // Poll every 5 seconds as a fallback
  );

  const { trigger: triggerWithdraw } = useSWRMutation(
    "swr.user.withdraw",
    async (_, { arg }: { arg: { amount: number; id: string } }) => {
      const res = await withdraw(arg);
      return res;
    },
    {
      onSuccess: (data) => {
        mutate(
          "swr.auth.me",
          (currentData: any) => ({
            ...currentData,
            amount: (Number(currentData.amount) - withdrawAmount).toString(),
            withdrawesPending: [
              ...(currentData.withdrawesPending || []),
              data._id,
            ],
          }),
          false
        );
        message.success(
          `Successfully requested withdrawal of ${withdrawAmount} chips`
        );
        setIsWithdrawModalOpen(false);
        setWithdrawAmount(0);
      },
      onError: (err) => {
        message.error(err.message || "Withdrawal failed");
      },
    }
  );

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    // Set initial lobbies from SWR if available
    if (swrLobbies && swrLobbies.length > 0 && lobbies.length === 0) {
      setLobbies(swrLobbies);
      if (!selectedRoom) updateSelectedRoom(swrLobbies[0]);
    }

    const handleLobbyList = (lobbyList: ITable[]) => {
      setLobbies(lobbyList || []);
      if (!selectedRoom && lobbyList.length > 0) {
        updateSelectedRoom(lobbyList[0]);
      }
    };

    const handleTableUpdate = (updatedLobby: ITable) => {
      setLobbies((prev) =>
        prev.map((lobby) =>
          lobby._id === updatedLobby._id ? updatedLobby : lobby
        )
      );
      if (selectedRoom?.id === updatedLobby._id) {
        updateSelectedRoom(updatedLobby);
      }
    };

    socket.on("lobbyList", handleLobbyList);
    socket.on("tableUpdate", handleTableUpdate);
    socket.on("error", ({ message: errorMessage }) => {
      message.error(errorMessage || "An error occurred");
    });
    socket.on("tableFull", ({ message: fullMessage }) => {
      message.error(fullMessage || "Table is full");
    });
    socket.on("connect", () => {
      socket.emit("getLobbyList"); // Request lobby list on reconnect
    });
    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    // Initial fetch
    socket.emit("getLobbyList");

    return () => {
      socket.off("lobbyList", handleLobbyList);
      socket.off("tableUpdate", handleTableUpdate);
      socket.off("error");
      socket.off("tableFull");
      socket.off("connect");
      socket.off("disconnect");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom, swrLobbies]);
  // ss

  const joinedTable = (tableId: string) => {
    router.push(`/table/${tableId}`);
    socket.emit("joinTable", { userId: userData?._id, tableId });
  };

  const handleSelectRoom = (lobby: ITable) => {
    updateSelectedRoom(lobby);
    socket.emit("getTableData", lobby._id);
    setIsSelectedRoomVisible(true);
  };

  const updateSelectedRoom = (lobby: ITable) => {
    const players = lobby.players.map((player: any) => ({
      username: player.username || "Unnamed Player",
      flag: "🇲🇳",
      amount: player.chips?.toString() || "0",
    }));
    setSelectedRoom({
      id: lobby._id,
      name: lobby.name || "Unnamed",
      players,
      tableData: lobby,
    });
  };


  const logOut = async () => {
    try {
      dispatch(logout());
      localStorage.removeItem("token");
      window.location.href = "/";
    } catch (error: any) {
      message.error("Алдаа гарлаа");
    }
  };

  const handleWithdraw = async () => {
    if (!userData?._id || withdrawAmount <= 0) {
      message.error("Please enter a valid amount");
      return;
    }
    if (withdrawAmount > Number(userData?.amount || 0)) {
      message.error("Insufficient balance");
      return;
    }
    await triggerWithdraw({ amount: withdrawAmount, id: userData._id });
  };

  const handleSuccessfulLogin = () => {
    mutate("swr.auth.me");
    setIsLoginModalOpen(false);
  };

  const rooms = lobbies.map((lobby) => ({
    id: lobby._id,
    name: lobby.name || "Unnamed",
    blinds: `${lobby.smallBlind || 0}/${lobby.bigBlind || 0}`,
    pot: (lobby.pot || 0).toString(),
    players: `${lobby.players?.length || 0}/${lobby.maxPlayers || 0}`,
    type: lobby.gameType || "Unknown",
    buyIn: (lobby.buyIn || 0).toString(),
    status: lobby.status || "Registering",
    color: "text-white",
  }));

  const tournaments = [
    {
      id: "7",
      name: "100k FREE ROLL",
      time: "Mar 10, 12:00",
      buyIn: "100",
      prize: "100000",
      status: "Completed",
    },
    {
      id: "8",
      name: "1M GTD",
      time: "Mar 10, 09:30",
      buyIn: "2000",
      prize: "1000000",
      status: "Registering",
    },
  ];

  const gameTypes = [
    "All",
    ...Array.from(new Set(rooms.map((room) => room.type))),
  ];

  const filteredRooms =
    gameType === "All" ? rooms : rooms.filter((room) => room.type === gameType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-purple-900 text-white font-sans flex flex-col lg:flex-row">
      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex-1 p-4 lg:p-6 relative"
      >
        {/* Toggle Button for Sidebar on Mobile */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="lg:hidden fixed top-4 right-4 z-50 bg-gray-800 p-2 rounded-full shadow-md"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <MenuOutlined className="text-white text-xl" />
        </motion.button>

        {/* Navbar (Tabs and Filters) */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
          <div className="flex border-b border-gray-700">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 text-base lg:text-lg font-semibold ${
                activeTab === "cash"
                  ? "text-yellow-300 border-b-4 border-yellow-300"
                  : "text-gray-400"
              }`}
              onClick={() => setActiveTab("cash")}
            >
              Ширээнүүд
            </motion.button>
            {/* <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 text-base lg:text-lg font-semibold ml-2 lg:ml-4 ${
                activeTab === "tournament"
                  ? "text-yellow-300 border-b-4 border-yellow-300"
                  : "text-gray-400"
              }`}
              onClick={() => setActiveTab("tournament")}
            >
              Тэмцээн
            </motion.button> */}
          </div>
          <div className="flex flex-wrap gap-2 lg:space-x-3">
            {gameTypes.map((type) => (
              <motion.button
                key={type}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`px-3 py-1 lg:px-4 lg:py-2 rounded-lg shadow-md text-sm lg:text-base ${
                  gameType === type
                    ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-black"
                    : "bg-gray-800 text-white"
                }`}
                onClick={() => setGameType(type)}
              >
                {type}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Room List */}
        <AnimatePresence mode="wait">
          {activeTab === "cash" && (
            <motion.div
              key="cash"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="bg-gray-800/80 backdrop-blur-md rounded-xl shadow-xl overflow-hidden"
            >
              <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] bg-gradient-to-r from-gray-700 to-gray-600 text-gray-200 p-3 text-sm font-bold sticky top-0 z-10">
                <p>Room</p>
                <p>Status</p>
                <p>Blinds</p>
                <p>Players</p>
                <p>Buy-In</p>
                <p>Action</p>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-300px)] lg:max-h-[calc(100vh-450px)]">
                {filteredRooms.length > 0 ? (
                  filteredRooms.map((room) => (
                    <motion.div
                      key={room.id}
                      whileHover={{ scale: 1.02 }}
                      className={`p-3 border-b border-gray-700 text-sm cursor-pointer flex flex-col lg:grid lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-2 lg:gap-0 ${
                        selectedRoom?.id === room.id ? "bg-gray-700/90" : ""
                      }`}
                      onClick={() =>
                        handleSelectRoom(
                          lobbies.find((l) => l._id === room.id)!
                        )
                      }
                    >
                      <p className={`${room.color} font-semibold truncate`}>
                        {room.name}
                      </p>
                      <p className="text-yellow-300">{room.status}</p>
                      <p className="text-yellow-300">{room.blinds}</p>
                      <p className="text-red-400">{room.players}</p>
                      <p className="text-blue-300">{room.buyIn}</p>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={`px-4 py-1 rounded-lg text-white font-semibold self-start lg:self-auto ${
                          room.players.split("/")[0] ===
                          room.players.split("/")[1]
                            ? "bg-gray-600 cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
                        }`}
                        disabled={
                          room.players.split("/")[0] ===
                          room.players.split("/")[1]
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          joinedTable(room.id);
                        }}
                      >
                        Тоглох
                      </motion.button>
                    </motion.div>
                  ))
                ) : (
                  <p className="p-4 text-gray-400">
                    {swrError
                      ? "Failed to load rooms. Retrying..."
                      : "No rooms available yet. Loading..."}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "tournament" && (
            <motion.div
              key="tournament"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="bg-gray-800/80 backdrop-blur-md rounded-xl shadow-xl overflow-hidden"
            >
              <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] bg-gradient-to-r from-gray-700 to-gray-600 text-gray-200 p-3 text-sm font-bold sticky top-0 z-10">
                <p>Tournament</p>
                <p>Time</p>
                <p>Status</p>
                <p>Buy-In</p>
                <p>Prize</p>
                <p>Action</p>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-300px)] lg:max-h-[calc(100vh-450px)]">
                {tournaments.map((tournament) => (
                  <motion.div
                    key={tournament.id}
                    whileHover={{ scale: 1.02 }}
                    className="p-3 border-b border-gray-700 text-sm flex flex-col lg:grid lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 lg:gap-0"
                  >
                    <p className="text-yellow-300 font-semibold truncate">
                      {tournament.name}
                    </p>
                    <p>{tournament.time}</p>
                    <p className="text-yellow-300">{tournament.status}</p>
                    <p className="text-blue-300">{tournament.buyIn}</p>
                    <p className="text-green-400">{tournament.prize}</p>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1 rounded-lg text-white font-semibold hover:from-blue-500 hover:to-indigo-500 self-start lg:self-auto"
                    >
                      Тоглох
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {selectedRoom && isSelectedRoomVisible && (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.3 }}
    className="hidden lg:block bg-gray-800/80 backdrop-blur-md rounded-xl shadow-xl p-4 mb-6 w-full lg:w-1/3 flex-col h-full"
  >
    <div className="bg-gradient-to-r from-green-600 to-gray-900 rounded-lg p-4 mb-4 flex justify-between items-center">
      <div>
        <h3 className="text-lg font-bold text-yellow-300">Ширээ: {selectedRoom.name}</h3>
        <p className="text-sm text-white">
          Блайнд: {selectedRoom.tableData?.smallBlind} / {selectedRoom.tableData?.bigBlind} | Мөнгөн дүн:{" "}
          {Number(selectedRoom.tableData?.pot || 0).toLocaleString()}
        </p>
      </div>
    </div>

    <div className="flex flex-col flex-1 min-h-0">
      <div className="w-full mb-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Тоглогчид:</h4>
        {selectedRoom.players.length > 0 ? (
          <div className="space-y-2">
            {selectedRoom.players.map((player, index) => (
              <div 
                key={index} 
                className="flex justify-between items-center text-sm text-white py-2 px-3 bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-300">{player.flag}</span>
                  <span className="font-medium">{player.username || "Unnamed Player"}</span>
                </div>
                <span className="text-green-400 font-semibold">
                  ₮{Number(player.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Тоглогч байхгүй байна</p>
        )}
      </div>

      <div className="w-full flex justify-center mb-4 flex-shrink-0 overflow-hidden">
        <div className="max-h-[300px] w-full">
          <PokerTableSVG
            scale={0.7}
            pot={Number(selectedRoom.tableData?.pot || 0)}
            maxPlayers={selectedRoom.tableData?.maxPlayers || 0}
            tableStatus={selectedRoom.tableData?.status || "Unknown"}
            round={String(selectedRoom.tableData?.round || 0)}
            players={selectedRoom.tableData?.players || []}
            isDealing={isDealing}
            winners={winners}
            onSeatClick={(seatId) => console.log(`Seat clicked: ${seatId}`)}
            isUserSeated={false}
          />
        </div>
      </div>

      <div className="w-full flex justify-between mb-4 flex-shrink-0 relative z-10">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsSelectedRoomVisible(false)}
          className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition"
        >
          Хаах
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => joinedTable(selectedRoom.id)}
          className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition"
        >
          Суух
        </motion.button>
      </div>

      <div className="w-full mt-auto flex-shrink-0 relative z-10">
        <Image
          src={gift}
          alt="Animated GIF"
          width={300}
          height={100}
          className="w-full h-auto rounded-lg"
        />
      </div>
    </div>
  </motion.div>
)}

      {/* Sidebar and Modals remain unchanged */}
      <motion.div
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="hidden lg:flex lg:flex-col lg:w-72 h-screen bg-gray-900 backdrop-blur-md p-6 shadow-lg"
      >
        <div className="flex flex-col items-center space-y-6 w-full flex-grow">
          <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
            <Image
              src="/profile2.png"
              alt="Avatar"
              width={120}
              height={120}
              className="rounded-full border-4 border-yellow-300 shadow-md"
            />
          </motion.div>
          <div className="w-full space-y-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="w-full bg-gradient-to-r from-gray-700 to-gray-600 text-white py-3 rounded-lg flex justify-between items-center px-4 font-bold shadow-md"
            >
              {userData?.name || "Guest"}
              <div className="bg-blue-600 text-white p-2 rounded-full">
                <CopyOutlined style={{ fontSize: "16px" }} />
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="w-full bg-gradient-to-r from-blue-700 to-indigo-700 text-white py-3 rounded-lg shadow-md flex justify-between items-center px-4"
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
        <div className="w-full space-y-6 pb-4">
          {userData?._id ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-gradient-to-r from-red-700 to-red-600 text-white py-3 rounded-lg flex justify-center items-center shadow-md"
              onClick={logOut}
            >
              <LogoutOutlined className="mr-2" /> Гарах
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-gradient-to-r from-green-700 to-green-600 text-white py-3 rounded-lg flex justify-center items-center shadow-md"
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
      </motion.div>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "tween", duration: 0.3 }}
            className="lg:hidden fixed inset-y-0 right-0 w-72 bg-gray-900 backdrop-blur-md p-6 flex flex-col justify-between items-center shadow-lg z-40"
          >
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
            <div className="w-full space-y-4">
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
          </motion.div>
        )}
      </AnimatePresence>

      {isWithdrawModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border-2 border-yellow-600 w-11/12 max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Мөнгө татах</h2>
            <p className="text-gray-300 mb-4">
              Нийт мөнгө: {(Number(userData?.amount) || 0).toFixed(2)} ₮
            </p>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(Number(e.target.value))}
              min={1}
              max={Number(userData?.amount) || 0}
              className="w-full p-2 mb-4 bg-gray-700 text-white rounded-lg border border-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="Enter amount to withdraw"
            />
            <div className="flex justify-between">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setIsWithdrawModalOpen(false);
                  setWithdrawAmount(0);
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
                  withdrawAmount > Number(userData?.amount || 0)
                }
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-500 disabled:opacity-50"
              >
                Татах
              </motion.button>
            </div>
          </div>
        </div>
      )}

      <LoginModal
        modal={isLoginModalOpen}
        setModal={setIsLoginModalOpen}
        onSuccessfulLogin={handleSuccessfulLogin}
      />
    </div>
  );
}