import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function SocialOverviewPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Social Media Overview</h1>
          <p className="text-muted text-sm mt-1">Manage your social settings and data here.</p>
        </div>
        <Button>
          <Plus size={16} className="mr-2" />
          Create New
        </Button>
      </div>
      
      <div className="p-8 border border-default border-dashed rounded-lg flex flex-col items-center justify-center text-center bg-surface">
        <h3 className="text-lg font-medium text-text mb-2">No data yet</h3>
        <p className="text-muted text-sm max-w-sm mb-4">
          You haven't created anything in this module yet. Get started by creating your first item.
        </p>
        <Button variant="outline">Get Started</Button>
      </div>
    </div>
  );
}
