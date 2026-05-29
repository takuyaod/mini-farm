export default function ZoneDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-24 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-48 animate-pulse rounded-xl bg-gray-200" />
      </main>
    </div>
  )
}
