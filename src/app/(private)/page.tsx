"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";
import io, { Socket } from "socket.io-client";
import { motion } from "framer-motion";
import { useDispatch } from "react-redux";
import { authApi } from "@/apis";
import { withdraw } from "@/apis/money";
import { ITable } from "@/models/lobby";
import { siteApi } from "@/config/site";
import { logout } from "@/store/auth-slice";
import LoginModal from "@/components/modal/Login";
import Navbar from "../../components/PokerRoomList/Navbar";
import RoomList from "../../components/PokerRoomList/RoomList";
import SelectedRoom from "../../components/PokerRoomList/SelectedRoom";
import Sidebar from "../../components/PokerRoomList/Sidebar";
import MobileBottomNav from "../../components/PokerRoomList/MobileBottomNav";
import WithdrawModal from "../../components/PokerRoomList/WithdrawModal";
import TournamentList from "../../components/PokerRoomList/TournamentList";
import { message } from "@/utils/toast";

const socket: Socket = io(`${siteApi}`, {
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCassOpen, setIsCassOpen] = useState(false);
  const [lobbyMessages, setLobbyMessages] = useState<any[]>([])
  const { mutate } = useSWRConfig();

  const { data: userData } = useSWR<IUser>("swr.auth.me", async () => {
    const res = await authApi.me();
    return res;
  });

  const { data: swrLobbies } = useSWR<ITable[]>(
    "swr.lobby.list",
    async () => {
      const tables = await new Promise<ITable[]>((resolve) => {
        socket.emit("getLobbyList");
        socket.once("lobbyList", (lobbyList: ITable[]) => resolve(lobbyList));
      });
      return tables;
    },
    { refreshInterval: 5000 }
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
        message.success(`Successfully requested withdrawal of ${withdrawAmount} chips`);
        setIsWithdrawModalOpen(false);
        setWithdrawAmount(0);
      },
      onError: (err) => message.error(err.message || "Withdrawal failed"),
    }
  );

  useEffect(() => {
    if (!socket.connected) socket.connect();

    if (swrLobbies && swrLobbies.length > 0 && lobbies.length === 0) {
      setLobbies(swrLobbies);
      if (!selectedRoom) updateSelectedRoom(swrLobbies[0]);
    }

    const handleLobbyList = (lobbyList: ITable[]) => {
      setLobbies(lobbyList || []);
      if (!selectedRoom && lobbyList.length > 0) updateSelectedRoom(lobbyList[0]);
    };

    const handleTableUpdate = (updatedLobby: ITable) => {
      setLobbies((prev) =>
        prev.map((lobby) => (lobby._id === updatedLobby._id ? updatedLobby : lobby))
      );
      if (selectedRoom?.id === updatedLobby._id) updateSelectedRoom(updatedLobby);
    };

    const handleTableData = (tableData: ITable) => {
      if (selectedRoom?.id === tableData._id) {
        updateSelectedRoom(tableData);
      }
    };

    const handleLobbyMessages = (messages: any[]) => {
      setLobbyMessages(messages);
    };

    socket.on("lobbyList", handleLobbyList);
    socket.on("tableUpdate", handleTableUpdate);
    socket.on("lobbyMessages", handleLobbyMessages);
    socket.on("tableData", handleTableData);
    socket.on("error", ({ message: errorMessage }) =>
      message.error(errorMessage || "An error occurred")
    );
    socket.on("tableFull", ({ message: fullMessage }) =>
      message.error(fullMessage || "Table is full")
    );
    socket.on("connect", () => socket.emit("getLobbyList"));
    socket.on("disconnect", () => console.log("Socket disconnected"));

    socket.emit("getLobbyList");
    socket.emit("getLobbyMessages");

    return () => {
      socket.off("lobbyList", handleLobbyList);
      socket.off("tableUpdate", handleTableUpdate);
      socket.off("tableData", handleTableData);
      socket.off("lobbyMessages", handleLobbyMessages);
      socket.off("error");
      socket.off("tableFull");
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [selectedRoom, swrLobbies]);

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
    const players = (lobby.players || []).map((player: any) => ({
      username: player.username,
      flag: "🇲🇳",
      amount: player.chips?.toString(),
    }));
    setSelectedRoom({ id: lobby._id, name: lobby.name || "Unnamed", players, tableData: lobby });
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
    { id: "7", name: "100k FREE ROLL", time: "Mar 10, 12:00", buyIn: "100", prize: "100000", status: "Completed" },
    { id: "8", name: "1M GTD", time: "Mar 10, 09:30", buyIn: "2000", prize: "1000000", status: "Registering" },
  ];

  const gameTypes = ["All", ...Array.from(new Set(rooms.map((room) => room.type)))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-purple-900 text-white font-sans flex flex-col lg:flex-row">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex-1 p-4 lg:p-6 relative"
      >
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          gameType={gameType}
          setGameType={setGameType}
          gameTypes={gameTypes}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
        {activeTab === "cash" ? (
          <RoomList
            rooms={rooms.filter((room) => gameType === "All" || room.type === gameType)}
            selectedRoom={selectedRoom}
            handleSelectRoom={handleSelectRoom}
            joinedTable={joinedTable}
            lobbies={lobbies}
          />
        ) : (
          <TournamentList tournaments={tournaments} />
        )}
      </motion.div>

      <SelectedRoom
        selectedRoom={selectedRoom}
        isSelectedRoomVisible={isSelectedRoomVisible}
        setIsSelectedRoomVisible={setIsSelectedRoomVisible}
        joinedTable={joinedTable}
        isDealing={isDealing}
        winners={winners}
      />

      <Sidebar
        userData={userData}
        logOut={logOut}
        setIsWithdrawModalOpen={setIsWithdrawModalOpen}
        setIsLoginModalOpen={setIsLoginModalOpen}
        isSidebarOpen={isSidebarOpen}
      />

      <MobileBottomNav
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        isCassOpen={isCassOpen}
        setIsCassOpen={setIsCassOpen}
        lobbyMessages={lobbyMessages}
      />

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        setIsOpen={setIsWithdrawModalOpen}
        withdrawAmount={withdrawAmount}
        setWithdrawAmount={setWithdrawAmount}
        userData={userData}
        handleWithdraw={handleWithdraw}
      />

      <LoginModal
        modal={isLoginModalOpen}
        setModal={setIsLoginModalOpen}
        onSuccessfulLogin={handleSuccessfulLogin}
      />
    </div>
  );
}