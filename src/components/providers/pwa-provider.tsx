"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useToast } from "@/components/shared/toast-provider";
const PwaContext = createContext({ isOnline: true });
export function usePwa() { return useContext(PwaContext); }
export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const { addToast } = useToast();
  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => { setIsOnline(false); addToast("Нет соединения. Для открытия материалов и сохранения прогресса нужна сеть.", "info"); };
    if (!navigator.onLine) offline();
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then(r => r.update()).catch(() => {});
    }
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, [addToast]);
  return <PwaContext.Provider value={{ isOnline }}>{children}</PwaContext.Provider>;
}
