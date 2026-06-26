import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-6">
      <div className="max-w-md text-center space-y-6">
        <div className="text-8xl font-extrabold text-brand-yellow">404</div>
        <h1 className="text-2xl font-bold">Página no encontrada</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          La página que estás buscando no existe o fue movida.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl bg-brand-yellow px-6 py-3 text-sm font-bold text-black transition hover:bg-brand-yellow-hover"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
