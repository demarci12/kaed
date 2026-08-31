'use client';

import { useEffect, useRef, useState } from 'react';
import { btn, btnGhost } from '@/components/ui';

function fmt(totalSeconds: number): string {
	const s = Math.max(0, totalSeconds);
	const m = Math.floor(s / 60);
	const sec = s % 60;
	return `${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
}

/**
 * A plain countdown, no persistence -- the framework's own suggested time-box
 * for a step (e.g. the 60-90 min pain audit). Component state only; unlike
 * the answers themselves, which save to the real database, losing the clock
 * on a refresh costs nothing worth the complexity of persisting it.
 */
export function StepTimer({ minutes }: { minutes: number }) {
	const total = minutes * 60;
	const [remaining, setRemaining] = useState(total);
	const [running, setRunning] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (!running) return;
		intervalRef.current = setInterval(() => {
			setRemaining((r) => {
				if (r <= 1) {
					setRunning(false);
					return 0;
				}
				return r - 1;
			});
		}, 1000);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [running]);

	const done = remaining === 0;

	return (
		<div className="flex items-center gap-3 flex-wrap p-3 mb-5 rounded-xl border border-line bg-paper">
			<span className={`font-mono text-2xl font-semibold tabular-nums ${done ? 'text-negative' : ''}`}>{fmt(remaining)}</span>
			<button type="button" className={btn} onClick={() => setRunning((r) => !r)} disabled={done}>
				{running ? 'Pause' : remaining === total ? 'Start' : 'Resume'}
			</button>
			<button
				type="button"
				className={btnGhost}
				onClick={() => {
					setRunning(false);
					setRemaining(total);
				}}
			>
				Reset
			</button>
			<span className="text-[13px] text-muted ml-auto">Suggested: {minutes} min</span>
		</div>
	);
}
