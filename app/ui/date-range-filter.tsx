'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'

type Props = {
  basePath: string
}

export default function DateRangeFilter({ basePath }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [from, setFrom] = useState(searchParams.get('from') ?? '')
  const [to, setTo] = useState(searchParams.get('to') ?? '')

  const handleFilter = useCallback(() => {
    const params = new URLSearchParams()
    params.set('page', '1')
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    router.push(`${basePath}?${params.toString()}`)
  }, [basePath, from, to, router])

  const handleClear = useCallback(() => {
    setFrom('')
    setTo('')
    router.push(basePath)
  }, [basePath, router])

  const hasFilter = !!from || !!to

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Desde
        </label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition focus:border-brand-yellow/50 focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Hasta
        </label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition focus:border-brand-yellow/50 focus:outline-none"
        />
      </div>
      <button
        onClick={handleFilter}
        className="rounded-lg bg-brand-yellow px-4 py-2 text-sm font-bold text-black transition hover:bg-brand-yellow-hover active:scale-95"
      >
        Filtrar
      </button>
      {hasFilter && (
        <button
          onClick={handleClear}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-muted-foreground/40"
        >
          Limpiar
        </button>
      )}
    </div>
  )
}
