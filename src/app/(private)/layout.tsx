"use client";

import { Navbar } from "@/components/nav-bar";
import { Header } from "@/components/header";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <div className="flex flex-row min-h-full bg-slate-50">
        {/* <Navbar /> */}
        <div className="flex flex-col w-full">

          {/* <Header /> */}
          {children}
        </div>
      </div>
  );
}
