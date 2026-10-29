import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Muhmol | Secure workspace accounts",
  description: "Secure account access for your Muhmol workspace.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
