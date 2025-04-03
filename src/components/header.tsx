import { useRouter } from "next/navigation";
import { message } from "@/utils/toast";
import Image from "next/image";
import info from "../../public/poker/info.svg";
import home from "../../public/poker/home.svg";
import addmoney from "../../public/poker/addmoney.svg";
import leave from "../../public/poker/tableexit.svg";
import fullscreenIcon from "../../public/poker/fullscreen.svg";
import { useState, useEffect } from "react";
import { authApi } from "@/apis/";
import useSWR from "swr";
import io from "socket.io-client";
import { useDispatch } from "react-redux";
import { siteApi } from "@/config/site";
const socket = io(`${siteApi}`, {
  withCredentials: true,
  reconnection: true,
});

export function Header() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [isAddMoneyModalOpen, setIsAddMoneyModalOpen] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [addAmount, setAddAmount] = useState<number>(0);
  const [tableData, setTableData] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasAutoFullscreenTriggered, setHasAutoFullscreenTriggered] = useState(false);

  const { data: currentUser } = useSWR("swr.user.me", async () => {
    try {
      const res = await authApi.me();
      return res;
    } catch (err: any) {
      message.error(err.message || "Failed to fetch user data");
      throw err;
    }
  });

  const handleAddMoney = () => {
    if (!currentUser?._id || addAmount <= 0) {
      message.error("Please enter a valid amount");
      return;
    }
    if (addAmount > (currentUser?.amount || 0)) {
      message.error("Insufficient balance");
      return;
    }
    const tableId = window.location.pathname.split("/")[2];
    if (!tableId) {
      message.error("You must be at a table to add chips");
      return;
    }

    socket.emit("addChips", {
      tableId,
      userId: currentUser._id,
      amount: addAmount,
    });

    message.success(`Added ${addAmount} chips to the table`);
    setIsAddMoneyModalOpen(false);
    setAddAmount(0);
  };

  const handleInfoClick = () => {
    const tableId = window.location.pathname.split("/")[2];
    if (!tableId) {
      message.error("You must be at a table to view table info");
      return;
    }

    if (!isInfoPanelOpen) {
      socket.emit("getTableData", tableId);
    }
    setIsInfoPanelOpen(!isInfoPanelOpen);
  };

  const handleLeaveTable = () => {
    const tableId = window.location.pathname.split("/")[2];
    if (!tableId) {
      message.error("You must be at a table to leave");
      return;
    }

    if (!isPlayerAtTable) {
      message.error("You are not at the table");
      return;
    }

    if (window.confirm("Are you sure you want to leave the table?")) {
      socket.emit("leaveSeat", { tableId, userId: currentUser._id });
    } else {
      message.success("Leave action canceled");
    }
  };

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => message.error(`Failed to enter fullscreen: ${err.message}`));
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => message.error(`Failed to exit fullscreen: ${err.message}`));
    }
  };

  const isPlayerAtTable =
    tableData?.players?.some((player: any) => player.user === currentUser?._id) ||
    tableData?.waitingPlayers?.some((player: any) => player.user === currentUser?._id) ||
    false;

  useEffect(() => {
    const updateScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    updateScreenSize();
    window.addEventListener("resize", updateScreenSize);
    return () => window.removeEventListener("resize", updateScreenSize);
  }, []);

  useEffect(() => {
    if (!currentUser?._id) return;

    const tableId = window.location.pathname.split("/")[2];
    if (tableId) {
      socket.emit("getTableData", tableId); // Fetch initial table data on mount

      socket.on("connect", () => {
        socket.emit("getTableData", tableId); // Re-fetch on reconnect
      });

      socket.on("tableData", (data) => {
        setTableData(data);
      });

      socket.on("tableUpdate", (data) => {
        setTableData(data);
      });

      socket.on("joinedTable", (data) => {
        setTableData(data);
      });

      socket.on("seatJoined", ({ table }) => {
        setTableData(table);
      });

      socket.on("leftTable", ({ chipsRefunded }) => {
        message.success(`You have left the table and reclaimed ${chipsRefunded} chips`);
        router.push("/");
        setHasAutoFullscreenTriggered(false);
        setTableData(null);
      });

      socket.on("error", (err) => {
        message.error(err?.message || err || "An error occurred");
        setIsInfoPanelOpen(false);
      });

      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener("fullscreenchange", handleFullscreenChange);

      // Join the table room explicitly
      socket.emit("joinTable", { userId: currentUser._id, tableId });

      return () => {
        socket.off("connect");
        socket.off("tableData");
        socket.off("tableUpdate");
        socket.off("joinedTable");
        socket.off("seatJoined");
        socket.off("leftTable");
        socket.off("error");
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
      };
    }
  }, [currentUser?._id, router]);

  return (
    <div className="top-0 z-40 flex h-[5%] shrink-0 items-center gap-x-4 bg-transparent px-4 sm:gap-x-6 sm:px-8">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex items-center gap-x-4 lg:gap-x-6 relative">
          <Image
            src={home}
            alt="home"
            onClick={() => router.push("/")}
            className="cursor-pointer"
          />
          <div className="relative">
            {isPlayerAtTable && (
              <Image
                src={info}
                alt="info"
                onClick={handleInfoClick}
                className="cursor-pointer"
              />
            )}
            {isInfoPanelOpen && (
              <div className="absolute top-12 left-0 bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-600 w-64 z-50">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold text-white">Тоглоомын мэдээлэл</h3>
                  <button
                    onClick={() => setIsInfoPanelOpen(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                </div>
                {tableData ? (
                  <div className="text-gray-300 text-sm">
                    <p>
                      <strong>Ширээний нэр:</strong> {tableData.name}
                    </p>
                    <p>
                      <strong>Төрөл:</strong> {tableData.gameType}
                    </p>
                    <p>
                      <strong>Бодлогын төрөл:</strong>{" "}
                      {tableData.gameType === "Hold'em" ? "No Limit" : "N/A"}
                    </p>
                    <p>
                      <strong>Ширээний ул:</strong> {tableData.smallBlind}/
                      {tableData.bigBlind}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-300 text-sm">Мэдээлэл татаж байна...</p>
                )}
              </div>
            )}
          </div>
          {isPlayerAtTable && (
            <Image
              src={addmoney}
              alt="addmoney"
              onClick={isPlayerAtTable ? () => setIsAddMoneyModalOpen(true) : undefined}
              className={`cursor-pointer ${!isPlayerAtTable ? "opacity-50 cursor-not-allowed" : ""}`}
            />
          )}
        </div>
        <div className="flex-1" />
        {isPlayerAtTable && (
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            {!isMobile && (
              <Image
                src={fullscreenIcon}
                alt="fullscreen"
                onClick={handleFullscreenToggle}
                className="cursor-pointer fullscreen-icon"
              />
            )}
            <Image
              src={leave}
              alt="leave"
              onClick={handleLeaveTable}
              className={`cursor-pointer ${!isPlayerAtTable ? "opacity-50 cursor-not-allowed" : ""}`}
            />
            <div
              aria-hidden="true"
              className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10"
            />
          </div>
        )}
      </div>

      <style jsx>{`
        .fullscreen-icon {
          filter: brightness(0) invert(1);
        }
      `}</style>

      {isAddMoneyModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border-2 border-gold-600 w-96">
            <h2 className="text-xl font-bold text-white mb-4">Чип нэмэх</h2>
            <p className="text-gray-300 mb-4">
              Нийт мөнгө: {currentUser?.amount?.toFixed(2) || 0} ₮
            </p>
            <input
              type="number"
              value={addAmount}
              onChange={(e) => setAddAmount(Number(e.target.value))}
              min={1}
              max={currentUser?.amount || 0}
              className="w-full p-2 mb-4 bg-gray-700 text-white rounded-lg border border-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="Enter amount to add"
            />
            <div className="flex justify-between">
              <button
                onClick={() => {
                  setIsAddMoneyModalOpen(false);
                  setAddAmount(0);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-400"
              >
                Үгүй
              </button>
              <button
                onClick={handleAddMoney}
                disabled={addAmount <= 0 || addAmount > (currentUser?.amount || 0)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-500 disabled:opacity-50"
              >
                Нэмэх
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}