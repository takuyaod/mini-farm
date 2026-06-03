export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-5 w-10 animate-pulse rounded-full bg-gray-200" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-16 animate-pulse rounded-md bg-gray-100" />
              ))}
            </div>
            <div className="mt-3 flex justify-between">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
