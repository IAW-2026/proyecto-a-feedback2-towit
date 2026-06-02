'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { UserButton, useUser } from '@clerk/nextjs'

const navLinkClass = (active: boolean) =>
	`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition ${
		active
			? 'bg-slate-950 text-white shadow-sm'
			: 'text-slate-700 hover:bg-slate-100'
	}`

export function Topbar() {
	const pathname = usePathname()
	const { user, isLoaded } = useUser()

	if (pathname.startsWith('/auth') ||  pathname === '/') {
		return null
	}

	const role = (user?.publicMetadata as { role?: string } | undefined)?.role
	const isAdmin = role === 'admin-feedback'
	const onAdminDashboard = pathname === '/admin/dashboard'
	const onAdminRatings = pathname.startsWith('/admin/ratings')
	const onAdminReports = pathname.startsWith('/admin/reports')
	const onProfile = pathname.startsWith('/profile')
	const onHistory = pathname.startsWith('/history')
	const onRatingsHistory = pathname.startsWith('/ratings-history')

	return (
		<header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
			<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
				<div className="flex items-center gap-6">
					<div className="flex items-center gap-2">
						<Image
							src="/images/2.svg"
							alt="TowIt logo"
							width={32}
							height={32}
							className="h-8 w-8"
							priority
						/>
						<span className="text-base font-semibold tracking-tight text-slate-900">
							TowIt Feedback
						</span>
					</div>
					<nav className="flex items-center gap-2">
						{isAdmin ? (
							<>
								<Link
									href="/admin/dashboard"
									className={navLinkClass(onAdminDashboard)}
								>
									Dashboard
								</Link>
								<Link
									href="/admin/ratings"
									className={navLinkClass(onAdminRatings)}
								>
									Ratings
								</Link>
								<Link
									href="/admin/reports"
									className={navLinkClass(onAdminReports)}
								>
									Reports
								</Link>
							</>
						) : (
							<>
								<Link
									href={user ? `/profile/${user.id}` : '/'}
									className={navLinkClass(onProfile)}
								>
									Profile
								</Link>
								<Link href="/history" className={navLinkClass(onHistory)}>
									History
								</Link>
								<Link
									href="/ratings-history"
									className={navLinkClass(onRatingsHistory)}
								>
									Ratings history
								</Link>
							</>
						)}
					</nav>
				</div>
				<div className="flex items-center">
					{isLoaded && user ? <UserButton /> : null}
				</div>
			</div>
		</header>
	)
}
