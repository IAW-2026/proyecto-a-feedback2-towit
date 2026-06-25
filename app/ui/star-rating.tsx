'use client'

import { useState } from 'react'

type StarRatingProps = {
	name: string
	defaultValue?: number
	required?: boolean
}

export function StarRating({
	name,
	defaultValue = 0,
	required = false,
}: StarRatingProps) {
	const [value, setValue] = useState(defaultValue)
	const [hovered, setHovered] = useState(0)

	const displayValue = hovered || value

	return (
		<div className="mt-4 flex flex-wrap items-end gap-3">
			{[1, 2, 3, 4, 5].map((starValue) => {
				const isFilled = starValue <= displayValue
				return (
					<div key={starValue} className="flex flex-col items-center gap-2">
						<input
							id={`rating-${starValue}`}
							type="radio"
							name={name}
							value={starValue}
							checked={value === starValue}
							onChange={() => setValue(starValue)}
							required={required}
							className="peer sr-only"
						/>
						<label
							htmlFor={`rating-${starValue}`}
							onMouseEnter={() => setHovered(starValue)}
							onMouseLeave={() => setHovered(0)}
							className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl border shadow-sm transition-all hover:-translate-y-0.5 text-5xl ${
								isFilled
									? 'border-brand-yellow bg-brand-yellow/10 text-brand-yellow'
									: 'border-border bg-card text-muted-foreground'
							}`}
						>
							★
						</label>
						<span
							className={`text-xs font-medium ${isFilled ? 'text-brand-yellow' : 'text-muted-foreground'}`}
						>
							{starValue}
						</span>
					</div>
				)
			})}
		</div>
	)
}
