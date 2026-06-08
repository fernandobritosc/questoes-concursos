export function QuestaoSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-pulse">
      {/* Header bar */}
      <div className="p-5 border-b border-border bg-card flex items-center justify-between">
        <div className="h-4 bg-muted rounded w-32" />
        <div className="flex gap-2">
          <div className="w-7 h-7 bg-muted rounded-lg" />
          <div className="w-7 h-7 bg-muted rounded-lg" />
          <div className="w-7 h-7 bg-muted rounded-lg" />
        </div>
      </div>

      {/* Breadcrumb bar */}
      <div className="bg-muted px-6 py-2.5 border-b border-border">
        <div className="h-3 bg-muted-foreground/20 rounded w-48" />
      </div>

      {/* Metadata row */}
      <div className="bg-muted mx-6 mt-5 p-3 rounded-lg border border-border">
        <div className="flex flex-wrap gap-3">
          <div className="h-3 bg-muted-foreground/20 rounded w-16" />
          <div className="h-3 bg-muted-foreground/20 rounded w-20" />
          <div className="h-3 bg-muted-foreground/20 rounded w-12" />
          <div className="h-3 bg-muted-foreground/20 rounded w-24" />
          <div className="h-3 bg-muted-foreground/20 rounded w-40" />
        </div>
      </div>

      {/* Content area: enunciado + alternativas */}
      <div className="px-6 py-6 md:p-8 space-y-6">
        {/* Enunciado skeleton — 3 lines */}
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-5/6" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>

        {/* 5 alternativas */}
        <div className="space-y-3 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 rounded-xl border border-border"
            >
              <div className="w-6 h-6 rounded-full bg-muted flex-shrink-0" />
              <div className="h-3 bg-muted rounded flex-1" />
            </div>
          ))}
        </div>
      </div>

      {/* Footer bar */}
      <div className="bg-muted/70 p-5 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="h-8 bg-muted rounded-lg w-28" />
          <div className="h-8 bg-muted rounded-lg w-24" />
        </div>
      </div>
    </div>
  )
}
