"use client"

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-6">
      <div className="max-w-md text-center space-y-6">
        <div className="text-6xl font-extrabold text-red-400">!</div>
        <h1 className="text-2xl font-bold">Algo salió mal</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Ocurrió un error inesperado. Por favor intentá de nuevo.
        </p>
        <button
          onClick={reset}
          className="inline-block rounded-xl bg-brand-yellow px-6 py-3 text-sm font-bold text-black transition hover:bg-brand-yellow-hover cursor-pointer"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  )
}
