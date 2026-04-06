import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Merge Han",
  description: "A cute Korean snack-themed endless merge prototype built with Next.js.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
