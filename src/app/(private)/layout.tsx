"use client";

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
