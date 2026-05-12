import type { ReactNode } from "react";
import Image from "next/image";
import "./admin.css";

export const metadata = { title: "LHG CMS" };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="admin-body">
        {children}
      </body>
    </html>
  );
}
