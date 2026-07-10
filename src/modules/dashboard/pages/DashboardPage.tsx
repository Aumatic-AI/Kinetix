export function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <p className="text-muted mt-1">Welcome back to Kinetix. Here's what's happening today.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Placeholder cards */}
        <div className="bg-surface border border-default rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted">Active Campaigns</h3>
          <p className="text-3xl font-bold text-text mt-2">12</p>
        </div>
        <div className="bg-surface border border-default rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted">Total Spend (30d)</h3>
          <p className="text-3xl font-bold text-text mt-2">$4,250</p>
        </div>
        <div className="bg-surface border border-default rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted">AI Generations</h3>
          <p className="text-3xl font-bold text-text mt-2">148</p>
        </div>
      </div>
    </div>
  );
}
