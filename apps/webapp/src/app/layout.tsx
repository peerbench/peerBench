import Navbar from "@/components/navbar";
import { Inter } from "next/font/google";
import { ToastContainer } from "react-toastify";
import { twMerge } from "tailwind-merge";
import { ReactQueryClientProvider } from "@/components/providers/react-query-client";
import { PreloaderContextProvider } from "@/components/providers/preloader";
import { getUser } from "@/lib/actions/auth";
import { AuthContextProvider } from "@/components/providers/auth";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { Metadata } from "next";
import Script from "next/script";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "peerBench",
  description: "Decentralized AI benchmarking platform",
  icons: {
    icon: "/logo-gradient-bg.svg",
    shortcut: "/logo-gradient-bg.svg",
    apple: "/logo-gradient-bg.svg",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-GZV8TGT383"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-GZV8TGT383');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <AuthContextProvider user={user}>
          <ReactQueryClientProvider>
            <PreloaderContextProvider>
              <NuqsAdapter>
                <Navbar />
                <div className="min-h-[calc(100vh-64px)] flex overflow-y-auto">
                  <main
                    className={twMerge(
                      "flex-1 bg-gray-50 transition-all duration-300"
                    )}
                  >
                    {children}
                  </main>
                </div>
              </NuqsAdapter>
            </PreloaderContextProvider>
          </ReactQueryClientProvider>
          <ToastContainer position="bottom-right" />
        </AuthContextProvider>
      </body>
    </html>
  );
}
