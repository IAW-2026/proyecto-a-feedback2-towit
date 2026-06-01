'use client'

import { useState } from 'react'

type TagOption = {
	slug: string
	label: string
}

type CustomerTagChipsProps = {
	name: string
	options: readonly TagOption[]
	defaultValue?: string | null
}

export function CustomerTagChips({
	name,
	options,
	defaultValue = null,
}: CustomerTagChipsProps) {
	const [selected, setSelected] = useState<string | null>(defaultValue)

	return (
		<div className="mt-4 flex flex-wrap gap-2">
			{options.map((tag) => {
				const isChecked = selected === tag.slug
				return (
					<div key={tag.slug}>
						<input
							id={`tag-${tag.slug}`}
							type="radio"
							name={name}
							value={tag.slug}
							checked={isChecked}
							onChange={() => setSelected(tag.slug)}
							className="peer sr-only"
						/>
						<label
							htmlFor={`tag-${tag.slug}`}
							onClick={(event) => {
								if (isChecked) {
									event.preventDefault()
									setSelected(null)
								}
							}}
							className="inline-flex cursor-pointer items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:text-amber-600 peer-checked:border-amber-300 peer-checked:bg-amber-50 peer-checked:text-amber-700"
						>
							{tag.label}
						</label>
					</div>
				)
			})}
		</div>
	)
}
