import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CreateForgeDialog } from "@/components/create-forge-dialog";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Zap } from "lucide-react";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: forgesData, error: forgesError } = await supabase
    .from("forges")
    .select(`
      *,
      forge_members(count)
    `)
    .eq("forge_members.user_id", user.id)
    .order("created_at", { ascending: false });

  if (forgesError) {
    console.error("Supabase error:", forgesError);
  }

  const forges = forgesData ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Your Forges</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your unified multi-repo workspaces
            </p>
          </div>
          <CreateForgeDialog />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!forges || forges.length === 0 ? (
          <EmptyState
            icon={<Zap className="h-12 w-12" />}
            title="No Forges yet"
            description="Create your first Forge to start managing your repositories in one unified workspace."
            action={<CreateForgeDialog />}
          />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {forges.map((forge: any) => {
              const memberCount = forge.forge_members?.[0]?.count ?? 0;
              return (
                <Link key={forge.id} href={`/forge/${forge.id}`}>
                  <Card className="p-6 h-full transition-all hover:shadow-lg hover:border-border/80">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-semibold text-lg">{forge.name}</h3>
                      <Badge
                        variant={forge.status === "active" ? "default" : "secondary"}
                        className={forge.status === "active" ? "bg-green-600" : ""}
                      >
                        {forge.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {forge.description || "No description"}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{memberCount} member{memberCount !== 1 ? "s" : ""}</span>
                      <span>
                        {forge.created_at
                          ? formatDistanceToNow(new Date(forge.created_at), {
                              addSuffix: true,
                            })
                          : ""}
                      </span>
                    </div>
                    {user.email && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Owner: {user.email}
                      </p>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
