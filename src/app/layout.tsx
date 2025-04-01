import ReduxProvider from "@/store/redux-provider";
import { Roboto } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { MantineProvider } from "@mantine/core";
import { theme } from "../../theme";
import "/src/index.css";
import "@mantine/core/styles.css";
import { SocketProvider } from "@/context/socket-context";

const roboto = Roboto({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

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
      <body
        style={{
          height: "100%",
          overflow: "hidden"
        }}
      >
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