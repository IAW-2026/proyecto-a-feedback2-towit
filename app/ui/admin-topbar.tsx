'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { UserButton, useUser } from '@clerk/nextjs'

const navLinkClass = (active: boolean) =>
	`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
		active
			? 'bg-muted text-foreground'
			: 'text-muted-foreground hover:bg-muted hover:text-foreground'
	}`

export function AdminTopbar() {
	const pathname = usePathname()
	const { user, isLoaded } = useUser()

	const onAdminDashboard = pathname === '/admin/dashboard'
	const onAdminRatings = pathname.startsWith('/admin/ratings')
	const onAdminReports = pathname.startsWith('/admin/reports')

	return (
		<header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
			<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
				<div className="flex items-center gap-6">
					<Link href="/admin/dashboard" className="flex items-center gap-3">
						<Image
							src="/images/2.svg"
							alt="TowIt logo"
							width={40}
							height={40}
							className="h-8 w-auto md:h-10"
							priority
						/>
						<span className="hidden text-xl font-bold text-foreground md:inline md:text-2xl">
							TowIt Feedback
						</span>
					</Link>
					<nav className="flex items-center gap-1">
						<Link href="/admin/dashboard" className={navLinkClass(onAdminDashboard)}>
							Dashboard
						</Link>
						<Link href="/admin/ratings" className={navLinkClass(onAdminRatings)}>
							Calificaciones
						</Link>
						<Link href="/admin/reports" className={navLinkClass(onAdminReports)}>
							Reportes
						</Link>
					</nav>
				</div>
				<div className="flex items-center">
					{isLoaded && user ? (
						<UserButton
							appearance={{
								elements: { userButtonAvatarBox: '!h-9 !w-9 md:!h-10 md:!w-10' },
							}}
						/>
					) : null}
				</div>
			</div>
		</header>
	)
}
