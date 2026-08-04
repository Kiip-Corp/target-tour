import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function KtoLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <Sidebar />
      {children}
    </div>
  );
}
