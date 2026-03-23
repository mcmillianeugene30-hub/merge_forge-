export default function Loading() {
  return (
    <div className="space-y-8">
      <div>
        <div className="h-4 w-24 bg-muted rounded animate-pulse mb-4" />
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 rounded-2xl bg-muted animate-pulse" />
        <div className="h-80 rounded-2xl bg-muted animate-pulse" />
      </div>
    </div>
  );
}
