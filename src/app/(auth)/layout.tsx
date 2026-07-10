import { Hexagon } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-md p-8 bg-background rounded-lg shadow-md border border-default animate-fade-in">
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 bg-logo rounded-md flex items-center justify-center text-white font-bold text-2xl">
            <Hexagon size={24} fill="currentColor" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
