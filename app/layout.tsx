import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

export const metadata: Metadata = {
  title: "Creator Analytics Lab",
  description: "Personal multi-platform creator analytics and research platform powered by Neon PostgreSQL.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 flex min-h-screen antialiased selection:bg-indigo-500 selection:text-white">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}

