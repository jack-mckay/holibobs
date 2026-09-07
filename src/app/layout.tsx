import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "Holibobs",
  description: "Time-away planning for your team",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
