import Link from "next/link";
import { PRIMARY_NAV_ITEMS } from "@/config/navigation";
import { ProductModule } from "@/types";

interface PrimarySidebarProps {
  currentModule?: ProductModule;
  hasSecondary?: boolean;
}

export function PrimarySidebar({ currentModule, hasSecondary }: PrimarySidebarProps) {
  const isDashboard = currentModule === "dashboard";

  return (
    <>
      <div className={`${isDashboard ? "w-64" : "w-16"} flex-shrink-0 h-full bg-surface z-base transition-all`} />
      
      <aside className={`fixed left-0 top-15 ${isDashboard ? "w-64" : "w-16 hover:w-64"} h-[calc(100vh-58px)] bg-surface flex flex-col z-50 transition-all overflow-hidden group border-r border-default`}>
        <nav className="flex flex-col gap-1 w-full px-3 py-4">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const isActive = currentModule === item.module;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.id}
                href={item.href}
                className={`h-10 rounded-md flex items-center transition-colors overflow-hidden flex-shrink-0 ${
                  isActive 
                    ? "bg-secondary text-text font-medium" 
                    : "text-muted hover:bg-secondary hover:text-text"
                }`}
                title={item.label}
              >
                <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                  <Icon size={20} />
                </div>
                <span className={`whitespace-nowrap text-sm transition-opacity ${isDashboard ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
