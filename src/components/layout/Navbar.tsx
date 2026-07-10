import Link from "next/link";
import { Hexagon } from "lucide-react";
import { ProfileMenu } from "./ProfileMenu";

export function Navbar() {
  return (
    <header className="h-15 bg-background border-b border-default flex items-center justify-between px-6 z-nav flex-shrink-0 w-full relative">
      <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
        <div className="w-8 h-8 rounded-md bg-logo text-white flex items-center justify-center font-bold">
          <Hexagon size={18} fill="currentColor" />
        </div>
        <span className="font-bold text-xl text-text tracking-tight">
          Kinetix
        </span>
      </Link>
      
      <div className="flex items-center gap-4">
        <ProfileMenu />
      </div>
    </header>
  );
}
