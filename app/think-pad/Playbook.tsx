'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cardLabel, cx, FormError, scoreBadge, scoreSelect, segmented, segmentedActive, segmentedItem, textarea } from '@/components/ui';
import {
	ANCHORS, anchorScope, CANVAS, DECISIONS, EMPTY_ANSWER, GATE_VALIDATED, isFinished, NOTE_MAX, phasesFor, progress,
	SCORE_AXES, scoreAverage, type Anchor, type Answer, type Scope, type Status, type Step,
} from '@/lib/playbook';

type Answers = Record<number, Answer>;

const NEXT_STATUS: Record<Status, Status> = { todo: 'doing', doing: 'done', done: 'todo', skip: 'todo', go: 'todo', pivot: 'todo', kill: 'todo' };
const STATUS_LABEL: Record<Status, string> = {
	todo: 'Not started', doing: 'In progress', done: 'Done', skip: 'Skipped', go: 'Go', pivot: 'Pivot', kill: 'Kill',
};
const DECISION_LABEL: Partial<Record<Status, string>> = { go: 'Go', pivot: 'Pivot', kill: 'Kill' };

const mark =
	'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs leading-none';
const markByStatus: Record<Status, string> = {
	todo: 'border-line bg-canvas hover:border-ink',
	doing: 'border-ink bg-[linear-gradient(90deg,var(--color-ink)_50%,transparent_50%)]',
	done: 'border-ink bg-ink text-white',
	skip: 'border-dashed border-line bg-canvas text-muted',
	go: 'border-ink bg-ink text-white',
	pivot: 'border-ink bg-canvas text-ink',
	kill: 'border-[--color-negative-line] bg-[--color-negative-bg] text-[--color-negative]',
};
const markGlyph: Partial<Record<Status, string>> = { done: '✓', skip: '–', go: '✓', pivot: '↻', kill: '✕' };

/**
 * The playbook for one run: a progress rail, the canvas of key answers, and the
 * phases as an accordion of steps. Every change saves in the background
 * (optimistic, rolled back with a message if the save fails) -- no page reload.
 */
export function Playbook({ scope, ideaId, initial, you }: {
	scope: Scope;
	/** null = the personal run. */
	ideaId: string | null;
	initial: Answers;
	/** The personal run's answers, quoted by idea steps that build on them. */
	you: Answers;
}) {
	const phases = useMemo(() => phasesFor(scope), [scope]);
	const steps = useMemo(() => phases.flatMap((p) => p.steps), [phases]);
	const [answers, setAnswers] = useState<Answers>(initial);
	const answersRef = useRef(answers);
	answersRef.current = answers;
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(0);
	const [openPhases, setOpenPhases] = useState<Set<number>>(() => {
		const current = phases.find((p) => p.steps.some((s) => !isFinished(initial[s.n]?.status)));
		return new Set(current ? [current.id] : []);
	});
	const [openSteps, setOpenSteps] = useState<Set<number>>(new Set());
	const [jump, setJump] = useState<string | null>(null);

	const answerOf = (n: number): Answer => answers[n] ?? EMPTY_ANSWER;
	const total = progress(steps, answers);

	/** An anchor's answer, from this run or (for idea steps building on the personal run) from `you`. */
	function anchorAnswer(a: Anchor): { answer: Answer | undefined; here: boolean } {
		const step = ANCHORS[a].step;
		if (anchorScope(a) === scope) return { answer: answers[step], here: true };
		return { answer: scope === 'idea' ? you[step] : undefined, here: false };
	}
	const hasText = (answer: Answer | undefined) => Boolean(answer?.note.trim());

	const save = useCallback(async (n: number, patch: Partial<Answer>) => {
		const before = answersRef.current[n] ?? EMPTY_ANSWER;
		setAnswers((a) => ({ ...a, [n]: { ...(a[n] ?? EMPTY_ANSWER), ...patch } }));
		setError(null);
		setPending((p) => p + 1);
		try {
			const res = await fetch('/api/playbook/step', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ idea_id: ideaId, step: n, ...patch }),
			});
			const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
			if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not save.');
		} catch (e) {
			const undo = Object.fromEntries(Object.keys(patch).map((k) => [k, before[k as keyof Answer]]));
			setAnswers((a) => ({ ...a, [n]: { ...(a[n] ?? EMPTY_ANSWER), ...undo } }));
			setError(e instanceof Error ? e.message : 'Could not save.');
		} finally {
			setPending((p) => p - 1);
		}
	}, [ideaId]);

	const jumpToStep = useCallback((n: number) => {
		const phase = phases.find((p) => p.steps.some((s) => s.n === n));
		if (!phase) return;
		setOpenPhases((s) => new Set(s).add(phase.id));
		setOpenSteps((s) => new Set(s).add(n));
		setJump(`step-${n}`);
	}, [phases]);

	const jumpToPhase = (id: number) => {
		setOpenPhases((s) => new Set(s).add(id));
		setJump(`phase-${id}`);
	};

	// Scroll once the target is on screen, after the accordion has opened.
	useEffect(() => {
		if (!jump) return;
		document.getElementById(jump)?.scrollIntoView({ behavior: 'smooth', block: jump.startsWith('step-') ? 'center' : 'start' });
		setJump(null);
	}, [jump, openPhases]);

	// A link from another run (/think-pad#step-10) lands on that step.
	useEffect(() => {
		const m = window.location.hash.match(/^#step-(\d+)$/);
		if (m) jumpToStep(Number(m[1]));
	}, [jumpToStep]);

	const toggle = <T,>(set: Set<T>, value: T) => {
		const next = new Set(set);
		if (!next.delete(value)) next.add(value);
		return next;
	};

	const pct = total.total ? Math.round((total.done / total.total) * 100) : 0;

	return (
		<div className="mt-6">
			{error && <FormError>{error}</FormError>}

			<div className="rounded-2xl border border-line bg-paper p-4 sm:p-5">
				<div className="flex items-baseline justify-between gap-3">
					<p className="m-0 font-serif text-lg font-semibold">
						{total.done} of {total.total} steps
						<span className="ml-2 font-sans text-xs font-normal text-muted tabular-nums">{pct}%</span>
					</p>
					<span className="text-xs text-muted" aria-live="polite">{pending > 0 ? 'Saving…' : ''}</span>
				</div>
				<div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-canvas" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Steps finished">
					<div className="h-full rounded-full bg-ink transition-[width]" style={{ width: `${pct}%` }} />
				</div>
				<nav className="mt-3.5 flex flex-wrap gap-1.5" aria-label="Phases">
					{phases.map((p) => {
						const { done, total: n } = progress(p.steps, answers);
						const state = done === n ? 'bg-ink border-ink text-white' : done > 0 ? 'border-ink text-ink bg-canvas' : 'border-line text-muted bg-canvas hover:border-ink';
						return (
							<button
								key={p.id}
								type="button"
								title={`${p.title} · ${done}/${n}`}
								onClick={() => jumpToPhase(p.id)}
								className={cx('inline-flex h-7 min-w-7 cursor-pointer items-center justify-center gap-1 rounded-full border px-2 text-xs font-medium tabular-nums transition-colors', state)}
							>
								{p.id}
								<span className="hidden text-[10px] font-normal opacity-80 sm:inline">{done}/{n}</span>
							</button>
						);
					})}
				</nav>
			</div>

			<section className="mt-3 rounded-2xl border border-line bg-paper p-4 sm:p-5" aria-label="Canvas">
				<div className="flex items-baseline justify-between gap-3">
					<h2 className={cx(cardLabel, 'm-0')}>Canvas</h2>
					<p className="m-0 text-xs text-muted">The key answers. Written once, quoted wherever a step builds on them.</p>
				</div>
				<div className="mt-3 grid grid-cols-2 gap-2 sm:gap-2.5 sm:[grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]">
					{CANVAS[scope].map((a) => {
						const { answer } = anchorAnswer(a);
						const text = answer?.note.trim();
						return (
							<button
								key={a}
								type="button"
								onClick={() => jumpToStep(ANCHORS[a].step)}
								className="flex min-w-0 cursor-pointer flex-col gap-1 rounded-xl border border-line bg-canvas p-2.5 text-left transition-colors hover:border-ink sm:p-3"
							>
								<span className={cardLabel}>{ANCHORS[a].label} <span className="font-normal normal-case tracking-normal">#{ANCHORS[a].step}</span></span>
								<span className={cx('line-clamp-2 text-[13px] leading-snug sm:text-sm', text ? 'text-ink' : 'text-muted')}>{text || 'Not answered yet'}</span>
							</button>
						);
					})}
				</div>
			</section>

			{phases.map((p) => {
				const open = openPhases.has(p.id);
				const { done, total: n } = progress(p.steps, answers);
				return (
					<section key={p.id} id={`phase-${p.id}`} className="relative mt-3 scroll-mt-4 overflow-hidden rounded-2xl border border-line bg-paper">
						<button
							type="button"
							aria-expanded={open}
							onClick={() => setOpenPhases((s) => toggle(s, p.id))}
							className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-4 py-3 text-left"
						>
							<span className={cx(scoreBadge, done === n && 'border-ink bg-ink text-white')}>{p.id}</span>
							<span className="min-w-0 flex-1">
								<span className="block font-serif text-lg font-semibold leading-tight text-ink">{p.title}</span>
								<span className="block truncate text-xs text-muted">{p.goal}</span>
							</span>
							<span className="text-xs tabular-nums text-muted">{done}/{n}</span>
							<span aria-hidden="true" className={cx('text-muted transition-transform', open && 'rotate-90')}>▸</span>
						</button>
						<span aria-hidden="true" className="absolute bottom-0 left-0 h-0.5 bg-ink transition-[width]" style={{ width: `${n ? (done / n) * 100 : 0}%` }} />
						{open && (
							<ul className="m-0 list-none border-t border-line p-0">
								{p.steps.map((step) => (
									<StepRow
										key={step.n}
										step={step}
										answer={answerOf(step.n)}
										open={openSteps.has(step.n)}
										onToggle={() => setOpenSteps((s) => toggle(s, step.n))}
										save={save}
										scope={scope}
										anchorAnswer={anchorAnswer}
										hasText={hasText}
										jumpToStep={jumpToStep}
										inRun={(a) => anchorScope(a) === scope}
									/>
								))}
							</ul>
						)}
					</section>
				);
			})}
		</div>
	);
}

function StepRow({ step, answer, open, onToggle, save, scope, anchorAnswer, hasText, jumpToStep, inRun }: {
	step: Step;
	answer: Answer;
	open: boolean;
	onToggle: () => void;
	save: (n: number, patch: Partial<Answer>) => void;
	scope: Scope;
	anchorAnswer: (a: Anchor) => { answer: Answer | undefined; here: boolean };
	hasText: (a: Answer | undefined) => boolean;
	jumpToStep: (n: number) => void;
	inRun: (a: Anchor) => boolean;
}) {
	const decision = step.kind === 'decision';
	const finished = isFinished(answer.status);
	const avg = scoreAverage(answer.data);
	const preview = step.kind === 'scores' ? (avg != null ? `Average ${avg} / 10` : '') : answer.note.split('\n')[0];
	const uses = step.uses ?? [];
	const label = step.n === GATE_VALIDATED ? '◆' : String(step.n);

	return (
		<li id={`step-${step.n}`} className="scroll-mt-4 border-b border-line last:border-b-0">
			<div className="flex items-start gap-3 px-4 py-2.5">
				{decision ? (
					<span className={cx(mark, markByStatus[answer.status])} title={STATUS_LABEL[answer.status]}>{markGlyph[answer.status] ?? '?'}</span>
				) : (
					<button
						type="button"
						aria-label={`${step.t}: ${STATUS_LABEL[answer.status]}. Click to change.`}
						title={`${STATUS_LABEL[answer.status]} — click to change`}
						onClick={() => save(step.n, { status: NEXT_STATUS[answer.status] })}
						className={cx(mark, 'cursor-pointer p-0 transition-colors', markByStatus[answer.status])}
					>{markGlyph[answer.status]}</button>
				)}

				<div className="min-w-0 flex-1">
					<button
						type="button"
						aria-expanded={open}
						onClick={onToggle}
						className="flex w-full cursor-pointer items-start gap-2 border-0 bg-transparent p-0 text-left"
					>
						<span className="mt-[3px] w-6 shrink-0 text-[11px] tabular-nums text-muted">{label}</span>
						<span className="min-w-0 flex-1">
							<span className={cx('block text-[15px] leading-snug', finished ? 'text-muted' : 'text-ink')}>{step.t}</span>
							{preview && !open && <span className="mt-0.5 block truncate text-xs text-muted">{preview}</span>}
						</span>
						<span aria-hidden="true" className={cx('mt-0.5 text-muted transition-transform', open && 'rotate-90')}>▸</span>
					</button>

					{decision && (
						<div className={cx(segmented, 'mt-2')} role="group" aria-label="Decision">
							{DECISIONS.map((d) => (
								<button
									key={d}
									type="button"
									onClick={() => save(step.n, { status: answer.status === d ? 'todo' : d })}
									className={cx(answer.status === d ? segmentedActive : segmentedItem, 'cursor-pointer border-0', answer.status !== d && 'bg-transparent')}
								>{DECISION_LABEL[d]}</button>
							))}
						</div>
					)}

					{!open && !finished && uses.length > 0 && (
						<div className="mt-1.5 flex flex-wrap gap-1.5">
							{uses.map((a) => {
								const filled = hasText(anchorAnswer(a).answer);
								return <AnchorChip key={a} anchor={a} filled={filled} inRun={inRun(a)} jumpToStep={jumpToStep} />;
							})}
						</div>
					)}
				</div>
			</div>

			{open && (
				<div className="flex flex-col gap-3 px-4 pb-4 pl-[3.75rem]">
					{step.h && <p className="m-0 text-sm leading-relaxed text-muted">{step.h}</p>}

					{step.link && (
						<Link href={step.link.href} className="self-start text-xs text-ink underline underline-offset-2 hover:no-underline">
							Open {step.link.label} →
						</Link>
					)}

					{uses.length > 0 && (
						<div className="flex flex-col gap-2">
							{uses.map((a) => {
								const { answer: from } = anchorAnswer(a);
								const text = from?.note.trim();
								return (
									<div key={a} className="rounded-xl border border-line bg-canvas px-3 py-2">
										<div className="flex items-center justify-between gap-2">
											<span className={cardLabel}>From #{ANCHORS[a].step} · {ANCHORS[a].label}</span>
											<AnchorChip anchor={a} filled={Boolean(text)} inRun={inRun(a)} jumpToStep={jumpToStep} edit />
										</div>
										<p className={cx('m-0 mt-1 whitespace-pre-wrap text-sm leading-snug', text ? 'text-ink' : 'text-muted')}>{text || 'Not answered yet.'}</p>
									</div>
								);
							})}
						</div>
					)}

					{step.kind === 'scores' && (
						<div className="flex flex-wrap items-end gap-x-4 gap-y-3">
							{SCORE_AXES.map(({ key, label: axis }) => (
								<label key={key} className="flex flex-col gap-1">
									<span className={cardLabel}>{axis}</span>
									<select
										value={answer.data?.[key] ?? ''}
										onChange={(e) => {
											const data = { ...(answer.data ?? {}) };
											if (e.target.value) data[key] = Number(e.target.value);
											else delete data[key];
											const complete = SCORE_AXES.every((a) => typeof data[a.key] === 'number');
											save(step.n, { data: Object.keys(data).length ? data : null, ...(complete && answer.status !== 'done' ? { status: 'done' as const } : {}) });
										}}
										className={cx(scoreSelect, 'w-16', answer.data?.[key] == null && 'text-muted')}
									>
										<option value="">–</option>
										{Array.from({ length: 10 }, (_, i) => i + 1).map((v) => <option key={v} value={v}>{v}</option>)}
									</select>
								</label>
							))}
							<p className="m-0 pb-1.5 text-sm text-muted tabular-nums">{avg != null ? `Average ${avg} / 10` : 'Score all four'}</p>
						</div>
					)}

					<NoteField
						value={answer.note}
						label={step.anchor ? 'Your answer' : 'Notes'}
						placeholder={step.anchor ? `Write it here — it lands on the canvas.` : 'What you did, found or decided…'}
						onCommit={(note) => save(step.n, { note })}
					/>

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => save(step.n, { status: answer.status === 'skip' ? 'todo' : 'skip' })}
							className="cursor-pointer border-0 bg-transparent p-0 text-xs text-muted underline underline-offset-2 hover:text-ink hover:no-underline"
						>{answer.status === 'skip' ? 'Un-skip this step' : 'Skip this step'}</button>
						{scope === 'idea' && step.anchor && !hasText(answer) && <span className="text-xs text-muted">Later steps are waiting on this one.</span>}
					</div>
				</div>
			)}
		</li>
	);
}

/** "Target customer" as a pill: green-ish when answered, red-ish when a step is waiting on it. */
function AnchorChip({ anchor, filled, inRun, jumpToStep, edit = false }: {
	anchor: Anchor;
	filled: boolean;
	inRun: boolean;
	jumpToStep: (n: number) => void;
	edit?: boolean;
}) {
	const { label, step } = ANCHORS[anchor];
	const cls = cx(
		'inline-flex cursor-pointer items-center rounded-full border bg-transparent px-2 py-0 text-[11px] leading-5 no-underline',
		filled ? 'border-line text-muted hover:border-ink hover:text-ink' : 'border-[--color-negative-line] text-[--color-negative]',
	);
	const text = edit ? (filled ? 'Edit' : `Answer #${step}`) : filled ? label : `needs ${label}`;
	return inRun ? (
		<button type="button" className={cls} onClick={() => jumpToStep(step)}>{text}</button>
	) : (
		<Link href={`/think-pad#step-${step}`} className={cls}>{text}</Link>
	);
}

/** A textarea that saves when you leave it, not on every keystroke. */
function NoteField({ value, label, placeholder, onCommit }: {
	value: string;
	label: string;
	placeholder: string;
	onCommit: (note: string) => void;
}) {
	const [text, setText] = useState(value);
	useEffect(() => setText(value), [value]);
	return (
		<label className="block">
			<span className={cardLabel}>{label}</span>
			<textarea
				className={cx(textarea, 'mt-1.5')}
				rows={3}
				maxLength={NOTE_MAX}
				value={text}
				placeholder={placeholder}
				onChange={(e) => setText(e.target.value)}
				onBlur={() => { if (text !== value) onCommit(text); }}
			/>
		</label>
	);
}
