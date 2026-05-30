import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/shared/toast-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: {
    default: "AI Learning — Платформа для изучения ИИ",
    template: "%s | AI Learning",
  },
  description:
    "Изучайте искусственный интеллект с нуля: промпт-инжиниринг, ИИ-агенты, визуальный контент и вайб-кодинг",
  keywords: [
    "искусственный интеллект",
    "обучение",
    "промпт-инжиниринг",
    "ИИ-агенты",
    "вайб-кодинг",
    "AI",
    "курсы",
  ],
  authors: [{ name: "AI Learning" }],
  openGraph: {
    title: "AI Learning — Платформа для изучения ИИ",
    description:
      "Изучайте искусственный интеллект с нуля: промпт-инжиниринг, ИИ-агенты, визуальный контент и вайб-кодинг",
    type: "website",
    locale: "ru_RU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
