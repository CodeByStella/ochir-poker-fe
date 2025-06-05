import ReduxProvider from "@/store/redux-provider";
import { Roboto } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { MantineProvider } from "@mantine/core";
import { theme } from "../../theme";
import "/src/index.css";
import "@mantine/core/styles.css";
import { SocketProvider } from "@/context/socket-context";
import { Analytics } from '@vercel/analytics/next';
import { Metadata } from "next";

const roboto = Roboto({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ochir Poker",
    template: "Mongolian",
  },
  description: "This is real-time poker site for Mongolian",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html
      lang="en"
      className={roboto.className}
      style={{
        height: "100%",
        overflow: "hidden"
      }}
    >
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="upgrade-insecure-requests"
        />
      </head>

      <body
        style={{
          height: "100%",
          overflow: "hidden"
        }}
      >
        <Analytics />
        <SocketProvider>
          <ReduxProvider>
            <MantineProvider theme={theme}>{children}</MantineProvider>
            <Toaster />
          </ReduxProvider>
        </SocketProvider>
      </body>
    </html>
  );
}