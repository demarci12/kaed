'use client';

import { useEffect, useState } from 'react';
import { btn, input } from '@/components/ui';

// Where the banks you're likely to link are listed. Revolut is under its EU entity's country.
const COUNTRIES: [string, string][] = [
	['HU', 'Hungary'], ['LT', 'Lithuania'], ['GB', 'United Kingdom'], ['DE', 'Germany'],
	['AT', 'Austria'], ['SK', 'Slovakia'], ['RO', 'Romania'], ['FI', 'Finland'],
];

/** Country -> bank picker; the bank list comes live from Enable Banking, so it's always what's really supported. */
export function BankPicker() {
	const [country, setCountry] = useState('HU');
	const [banks, setBanks] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setBanks([]);
		setError(null);
		fetch(`/api/banking/banks?country=${country}`)
			.then(async (r) => ({ ok: r.ok, body: (await r.json()) as { banks?: string[]; error?: string } }))
			.then(({ ok, body }) => {
				if (cancelled) return;
				if (ok && body.banks) setBanks(body.banks);
				else setError(body.error ?? 'Could not load banks.');
			})
			.catch(() => !cancelled && setError('Could not load banks.'));
		return () => { cancelled = true; };
	}, [country]);

	return (
		<form method="post" action="/api/banking/connect" className="flex flex-wrap items-center gap-2.5 mt-6 px-4 py-3 border border-line rounded-xl bg-paper">
			<select name="country" value={country} onChange={(e) => setCountry(e.target.value)} className={`${input} !w-auto min-w-40`}>
				{COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
			</select>
			<select name="bank" required disabled={!banks.length} className={`${input} !w-auto flex-1 min-w-52`}>
				{banks.length ? banks.map((b) => <option key={b} value={b}>{b}</option>) : <option value="">{error ?? 'Loading banks…'}</option>}
			</select>
			<button type="submit" className={btn} disabled={!banks.length}>Connect bank</button>
		</form>
	);
}
