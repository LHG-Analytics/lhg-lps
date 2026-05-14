"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "./LogoutButton";
import { NavigationProgress } from "./NavigationProgress";

const NAV = [
  { href: "/admin",           label: "Dashboard"  },
  { href: "/admin/brands",    label: "Marcas"      },
  { href: "/admin/campaigns", label: "Campanhas"   },
  { href: "/admin/users",     label: "Usuários"    },
  { href: "/admin/audit",     label: "Auditoria"   },
] as const;

export function AdminShell({ userEmail, children }: { userEmail: string; children: ReactNode }) {
  const pathname = usePathname();

  function active(href: string) {
    return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  }

  return (
    <div className="admin-shell">
      <NavigationProgress />
      <aside className="admin-sidebar">
        <div className="admin-sidebar__logo">
          <Image
            src="/brands/lhg/logos/logo-white.webp"
            alt="LHG"
            width={120}
            height={30}
            style={{ width: "auto", height: 28 }}
          />
        </div>
        <nav className="admin-nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav__item${active(item.href) ? " active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <span className="admin-user-email">{userEmail}</span>
          <LogoutButton />
        </div>
      </aside>
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
