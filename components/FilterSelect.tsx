'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cx, filterSelect } from '@/components/ui';

/**
 * A filter as a dropdown: each option is just the page URL with that filter
 * applied, so the filters stay plain query-string links (shareable, no client
 * state) and the bar stays one row tall however many sources or contexts exist.
 */
export function FilterSelect({ label, value, options, active }: {
	label: string;
	/** href of the selected option. */
	value: string;
	options: { href: string; label: string }[];
	/** A real filter is applied (not the "All" option): highlight the control. */
	active: boolean;
}) {
	const router = useRouter();
	const [current, setCurrent] = useState(value);

	// Server stays the source of truth: adopt the URL after navigation.
	useEffect(() => setCurrent(value), [value]);

	return (
		<select
			aria-label={label}
			value={current}
			onChange={(e) => {
				setCurrent(e.target.value);
				router.push(e.target.value);
			}}
			className={cx(filterSelect, active ? 'border-ink font-medium' : 'border-line')}
		>
			{options.map((o) => <option key={o.href} value={o.href}>{o.label}</option>)}
		</select>
	);
}
