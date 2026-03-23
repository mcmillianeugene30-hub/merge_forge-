import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForgeNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-3xl font-bold mb-4">Forge not found</h1>
      <p className="text-muted-foreground mb-8">
        This forge does not exist or you do not have access to it.
      </p>
      <Button asChild>
        <Link href="/dashboard">← Back to Dashboard</Link>
      </Button>
    </div>
  );
}
