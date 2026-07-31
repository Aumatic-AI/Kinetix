"use client";

import { usePathname } from "next/navigation";
import { PrimarySidebar } from "@/components/layout/PrimarySidebar";
import { SecondarySidebar } from "@/components/layout/SecondarySidebar";
import { Navbar } from "@/components/layout/Navbar";
import { BackgroundJobsWidget } from "@/components/global/BackgroundJobsWidget";
import { GlobalJobTracker } from "@/components/global/GlobalJobTracker";
import { SessionBootstrap } from "@/components/providers/SessionBootstrap";
import { Toaster } from "sonner";
import { ProductModule } from "@/types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Basic routing logic to determine current module
  let currentModule: ProductModule = "dashboard";
  if (pathname.startsWith("/meta-ads")) currentModule = "metaAds";
  else if (pathname.startsWith("/outreach")) currentModule = "outreach";
  else if (pathname.startsWith("/social")) currentModule = "social";
  else if (pathname.startsWith("/settings")) currentModule = "settings";

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <SessionBootstrap />
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

      <BackgroundJobsWidget />
      <GlobalJobTracker />
      <Toaster richColors position="bottom-left" />
    </div>
  );
}
