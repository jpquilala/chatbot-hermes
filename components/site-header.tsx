import Link from "next/link";
import { Bot, Database, Info, Shield } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";

const links = [
  { href: "/", label: "AI Assistant", icon: Bot },
  { href: "/admin/knowledge-base", label: "Knowledge Base", icon: Database },
  { href: "/about", label: "About", icon: Info }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-court-black/88 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-5">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <LogoMark size="sm" />
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-bold text-white">EABA 40+</p>
            <p className="truncate text-xs text-white/55">4th Conference</p>
          </div>
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-white/72 transition hover:bg-white/8 hover:text-court-gold"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}
          <Link
            href="/admin/knowledge-base"
            className="ml-1 inline-flex h-10 items-center gap-2 rounded-md border border-court-gold/35 bg-court-gold px-3 text-sm font-bold text-black transition hover:bg-[#ffd36a]"
          >
            <Shield className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
