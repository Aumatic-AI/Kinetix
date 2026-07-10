import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";

export function MetaAdsOverviewPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Meta Ads Overview</h1>
          <p className="text-muted mt-1">Manage and analyze your Facebook and Instagram campaigns.</p>
        </div>
        <Button>
          <Plus size={16} className="mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Toolbar / Filters Placeholder */}
      <div className="bg-surface border border-default rounded-md p-4 flex gap-4">
        <div className="text-sm text-muted">Status: All</div>
        <div className="text-sm text-muted">Objective: All</div>
        <div className="text-sm text-muted">Date: Last 30 Days</div>
      </div>

      {/* Content Area Placeholder */}
      <div className="flex-1 bg-surface border border-default rounded-md flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-muted">
            📊
          </div>
          <h3 className="text-lg font-medium text-text">No campaigns yet</h3>
          <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
            Get started by creating your first AI-powered Meta Ads campaign.
          </p>
          <Button variant="outline" className="mt-4">
            Connect Ad Account
          </Button>
        </div>
      </div>
    </div>
  );
}
