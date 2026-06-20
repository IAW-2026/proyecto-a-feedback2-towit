import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Towit - Feedback",
  description: "Rate and report your tow trips",
  icons: {
    icon: "/images/2.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      afterSignOutUrl="/"
      appearance={{
        elements: {
          modalBackdrop: { background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" },
        },
        variables: {
          colorBackground: "#1C1C20",
          colorForeground: "#FFFFFF",
          colorPrimary: "#F5C518",
          colorPrimaryForeground: "#0A0A0B",
          colorMutedForeground: "#E4E4E7",
          colorInput: "#27272A",
          colorInputForeground: "#FFFFFF",
          colorNeutral: "#FFFFFF",
          colorBorder: "#F5F5F0",
          colorMuted: "#27272A",
          colorDanger: "#EF4444",
          colorSuccess: "#22C55E",
          colorWarning: "#F59E0B",
          borderRadius: "0.75rem",
        },
      }}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-background text-foreground">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
