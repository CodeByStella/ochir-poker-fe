"use client";
import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { authApi } from "@/apis";
import { IBank } from "@/models/bank";
import { bankApi } from "@/apis";
import { withdraw } from "@/apis/money";
import { ITable } from "@/models/table";
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
import { RootState } from "@/store";
import { IUser } from "@/models/user";
import { useSocketEvents } from "@/hooks/useSocketEvents";
import { ISelectedRoom, IWinnerData,  } from "@/models/poker";

export default function PokerRoomList() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<"cash" | "tournament">("cash");
  const [gameType, setGameType] = useState<string>("All");
  const [selectedRoom, setSelectedRoom] = useState<ISelectedRoom | null>(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [bankType, setBankType] = useState<string>("");
  const [bankAccount, setBankAccount] = useState<string>("")
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [isSelectedRoomVisible, setIsSelectedRoomVisible] = useState(true);
  const [winners, setWinners] = useState<IWinnerData[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCassOpen, setIsCassOpen] = useState(false);
  const [lobbyMessages, setLobbyMessages] = useState<any[]>([]);
  const { mutate } = useSWRConfig();
  const {token} = useSelector((state: RootState) => state.auth);

  const { data: userData } = useSWR<IUser>(`swr.auth.me.${token}`, async () => {
    const res = await authApi.me();
    return res;
  });

  const { data: bankData, error: bankError } = useSWR<IBank[]>(
    "swr.bank.me",
    async () => {
      const res = await bankApi.getBank();
      return res;
    }
  );

  const { trigger: triggerWithdraw } = useSWRMutation(
    "swr.user.withdraw",
    async (_, { arg }: { arg: { amount: number; id: string, bankType: string, bankAccount: string } }) => {
      const res = await withdraw(arg);
      return res;
    },
    {
      onSuccess: (data) => {
        mutate(
          "swr.auth.me",
          (currentData: any) => ({
            ...currentData,
            amount: (Number(currentData?.amount) - withdrawAmount).toString(),
            withdrawesPending: [
              ...(currentData?.withdrawesPending || []),
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
  const handleLobbyList = (lobbyList: ITable[]) => {
    if (!selectedRoom && lobbyList.length > 0) updateSelectedRoom(lobbyList[0]);
  };
  const handleTableData = (tableData: ITable) => {
    if (selectedRoom?.id === tableData?._id) {
      updateSelectedRoom(tableData);
    }
  };
  const handleLobbyMessages = (messages: any[]) => {
    setLobbyMessages(messages);
  };
  const {socket, isConnected} = useSocketEvents({
    onLobbyData: handleLobbyList,
    onTableUpdate: handleTableData,
    onLobbyMessage: handleLobbyMessages
  })

  const { data: lobbyData, error: lobbyError, isLoading: isLobbyLoading } = useSWR<ITable[]>(
    isConnected ? "swr.lobby.list" : null,
    async () => {
      if (!socket || !socket.connected) {
        throw new Error("Socket not connected");
      }
      return new Promise<ITable[]>((resolve, reject) => {
        socket.emit("getLobbyList");
        socket.on("lobbyList", (lobbyList: ITable[]) => {
          resolve(lobbyList);
        });
        socket.on("error", (msg: string) => {
          console.error("Socket error:", msg);
          reject(new Error(msg));
        });
        setTimeout(() => reject(new Error("Lobby list fetch timed out")), 5000);
      });
    },
    {
      refreshInterval: 5000,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        if (retryCount >= 5) return;
        setTimeout(() => revalidate({ retryCount: retryCount + 1 }), 1000);
      }
    }
  );


  


  const joinedTable = (tableId: string) => {
    router.push(`/table/${tableId}`);
    socket?.emit("joinTable", { userId: userData?._id, tableId });
  };

  const handleSelectRoom = (lobby: ITable) => {
    updateSelectedRoom(lobby);
    socket?.emit("getTableData", lobby._id);
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
      message.error("Дүн оруулна уу");
      return;
    }
    if (withdrawAmount > Number(userData?.amount || 0)) {
      message.error("Үлдэгдэл хүрэлгэхгүй байна");
      return;
    }
    await triggerWithdraw({ amount: withdrawAmount, id: userData._id, bankType, bankAccount });
  };

  const handleSuccessfulLogin = () => {
    mutate("swr.auth.me");
    setIsLoginModalOpen(false);
  };

    // Ensure lobbies are set even if useSWR hasn't completed
    useEffect(() => {
      if (lobbyData && lobbyData.length > 0 && !selectedRoom) {
        updateSelectedRoom(lobbyData[0]);
      }
    }, [lobbyData, selectedRoom]);

    const rooms = (lobbyData || []).map((lobby) => ({
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

  // Render loading state
  if (!isConnected || isLobbyLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-purple-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <svg
            className="animate-spin h-8 w-8 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="mt-2">Loading poker rooms...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (lobbyError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-purple-900 text-white flex items-center justify-center">
        <p>Error loading poker rooms. Please try again.</p>
      </div>
    );
  }
  
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
            lobbies={lobbyData || []} 
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
        bankData={bankData} 
        bankError={bankError}
      />

      <MobileBottomNav
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        isCassOpen={isCassOpen}
        setIsCassOpen={setIsCassOpen}
        lobbyMessages={lobbyMessages}
        bankData={bankData} 
        bankError={bankError}
        userData={userData}
      />

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        setIsOpen={setIsWithdrawModalOpen}
        withdrawAmount={withdrawAmount}
        setWithdrawAmount={setWithdrawAmount}
        userData={userData}
        handleWithdraw={handleWithdraw}
        bankType={bankType}
        setBankType={setBankType}
        bankAccount={bankAccount}
        setBankAccount={setBankAccount}
      />

      <LoginModal
        modal={isLoginModalOpen}
        setModal={setIsLoginModalOpen}
        onSuccessfulLogin={handleSuccessfulLogin}
      />
    </div>
  );
}