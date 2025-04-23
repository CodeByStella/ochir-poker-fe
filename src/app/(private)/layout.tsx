"use client";

import { SocketProvider } from "@/context/socket-context";
import { RootState } from "@/store";
import { useSelector } from "react-redux";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const {token} = useSelector((state:RootState) => state.auth);
  return (
    <SocketProvider token={token ? token : undefined}>
      <div className="flex flex-row min-h-full bg-slate-50">
        {/* <Navbar /> */}
        <div className="flex flex-col w-full">
          {/* <Header /> */}
          {children}
        </div>
      </div>
    </SocketProvider>
  );
}
