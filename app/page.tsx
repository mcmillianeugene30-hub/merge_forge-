import Link from "next/link";
import {
  GitBranch,
  Zap,
  Brain,
  LayoutDashboard,
  Flag,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-orange-500" />
          <span className="text-xl font-bold">
            Merge<span className="text-orange-500">Forge</span>
          </span>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            One workspace.
            <br />
            <span className="text-orange-500">Every repo.</span>
          </h1>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            AI-powered cross-repo project management. Unified issues, intelligent
            merge suggestions, and realtime collaboration across all your
            GitHub repositories.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors"
            >
              Start building
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium rounded-xl border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white transition-colors"
            >
              Open dashboard
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24">
          <FeatureCard
            icon={<GitBranch className="h-8 w-8 text-orange-500" />}
            title="Unified Issues"
            description="Aggregate and manage issues from multiple repos in one view"
          />
          <FeatureCard
            icon={<Brain className="h-8 w-8 text-purple-500" />}
            title="AI Merge Suggestions"
            description="Get intelligent recommendations for grouping and sequencing PRs"
          />
          <FeatureCard
            icon={<LayoutDashboard className="h-8 w-8 text-blue-500" />}
            title="Realtime Board"
            description="Kanban-style tracking with live collaboration"
          />
          <FeatureCard
            icon={<Flag className="h-8 w-8 text-green-500" />}
            title="Milestone Planning"
            description="Track progress across repositories with shared milestones"
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl border border-gray-800 bg-gray-900/50 hover:border-gray-700 transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}
