"use client";

import { usePathname } from "next/navigation";
import { PrimarySidebar } from "@/components/layout/PrimarySidebar";
import { SecondarySidebar } from "@/components/layout/SecondarySidebar";
import { Navbar } from "@/components/layout/Navbar";
import { ProductModule } from "@/types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Basic routing logic to determine current module
  let currentModule: ProductModule = "dashboard";
  if (pathname.startsWith("/meta-ads")) currentModule = "metaAds";
  else if (pathname.startsWith("/newsletter")) currentModule = "newsletter";
  else if (pathname.startsWith("/outreach")) currentModule = "outreach";
  else if (pathname.startsWith("/voice")) currentModule = "voice";
  else if (pathname.startsWith("/social")) currentModule = "social";
  else if (pathname.startsWith("/settings")) currentModule = "settings";

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <PrimarySidebar currentModule={currentModule} hasSecondary={currentModule !== "dashboard"} />
        
        {currentModule !== "dashboard" && (
          <SecondarySidebar currentModule={currentModule} currentPath={pathname} />
        )}
        
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
