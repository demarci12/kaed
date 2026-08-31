'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
	composeStepAnswer, parseStepAnswer, type IdeaLabStep, type StepAnswer,
} from '@/lib/idea-lab';
import { deleteBtn, input, label as labelClass, textarea } from '@/components/ui';
import { StepTimer } from './StepTimer';

/**
 * One reusable engine for every structured step (all of them except step 3,
 * the evidence log, and step 11, a plain enum select) instead of nine
 * bespoke components. Answers save as JSON in the step's existing text
 * column -- see parseStepAnswer/composeStepAnswer in lib/idea-lab.ts -- so
 * no schema change was needed to go from "one textarea" to "a real
 * multi-field worksheet."
 *
 * Fields are always visible and save on blur, matching the source worksheet
 * artifact's always-editable feel rather than kead's usual click-to-reveal
 * InlineEdit pattern -- appropriate here since a step is a form with several
 * fields at once, not one value.
 */
export function StepEditor({ candidateId, step, initialRaw }: { candidateId: string; step: IdeaLabStep; initialRaw: string | null }) {
	const router = useRouter();
	const [answer, setAnswer] = useState<StepAnswer>(() => parseStepAnswer(initialRaw));
	const [saving, setSaving] = useState(false);

	async function save(next: StepAnswer) {
		setAnswer(next);
		setSaving(true);
		try {
			const res = await fetch(`/api/idea-lab/${candidateId}/field`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ field: step.field, value: composeStepAnswer(next) }),
			});
			if (!res.ok) throw new Error('save failed');
			router.refresh();
		} catch (e) {
			console.error(e);
		} finally {
			setSaving(false);
		}
	}

	const setField = (key: string, value: string) => {
		const next = { ...answer, fields: { ...answer.fields, [key]: value } };
		setAnswer(next);
		return next;
	};
	const setSentencePart = (key: string, value: string) => {
		const next = { ...answer, sentence: { ...answer.sentence, [key]: value } };
		setAnswer(next);
		return next;
	};
	const setCheck = (key: string, value: boolean) => {
		const next = { ...answer, checks: { ...answer.checks, [key]: value } };
		save(next);
	};

	const ranked = answer.ranked ?? [];
	const setRankedPart = (index: number, key: string, value: string) => {
		const list = ranked.map((e, i) => (i === index ? { ...e, [key]: value } : e));
		const next = { ...answer, ranked: list };
		setAnswer(next);
		return next;
	};
	const addRankedEntry = () => {
		if (!step.ranked || ranked.length >= step.ranked.max) return;
		save({ ...answer, ranked: [...ranked, {}] });
	};
	const removeRankedEntry = (index: number) => {
		save({ ...answer, ranked: ranked.filter((_, i) => i !== index) });
	};

	return (
		<div className={saving ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
			{step.timerMinutes && <StepTimer minutes={step.timerMinutes} />}

			{answer.legacy && (
				<div className="mb-4 p-3.5 rounded-[10px] border border-line bg-canvas">
					<p className="m-0 text-xs text-muted uppercase tracking-[0.06em] font-semibold">Note from before this step had fields</p>
					<p className="mt-1.5 mb-0 text-sm whitespace-pre-wrap">{answer.legacy}</p>
				</div>
			)}

			{step.fields && (
				<div className="flex flex-col gap-4">
					{step.fields.map((f) => (
						<div key={f.key}>
							<label className={labelClass} htmlFor={`${step.field}-${f.key}`}>{f.label}</label>
							{f.kind === 'textarea' ? (
								<textarea
									id={`${step.field}-${f.key}`}
									className={textarea}
									rows={3}
									placeholder={f.placeholder}
									defaultValue={answer.fields?.[f.key] ?? ''}
									onBlur={(e) => save(setField(f.key, e.target.value))}
								/>
							) : (
								<input
									id={`${step.field}-${f.key}`}
									type="text"
									className={input}
									placeholder={f.placeholder}
									defaultValue={answer.fields?.[f.key] ?? ''}
									onBlur={(e) => save(setField(f.key, e.target.value))}
								/>
							)}
						</div>
					))}
				</div>
			)}

			{step.checks && (
				<div className="mt-5 flex flex-col gap-2.5">
					<span className={labelClass}>Signals that feel bad but are usually good</span>
					{step.checks.map((c) => (
						<label key={c.key} className="flex items-center gap-2.5 text-sm cursor-pointer">
							<input
								type="checkbox"
								checked={answer.checks?.[c.key] ?? false}
								onChange={(e) => setCheck(c.key, e.target.checked)}
								className="w-4 h-4 accent-ink cursor-pointer"
							/>
							{c.label}
						</label>
					))}
				</div>
			)}

			{step.sentence && (
				<div className="flex flex-col gap-4">
					{step.sentence.parts.map((p) => (
						<div key={p.key}>
							<label className={labelClass} htmlFor={`${step.field}-sentence-${p.key}`}>{p.label}</label>
							<input
								id={`${step.field}-sentence-${p.key}`}
								type="text"
								className={input}
								placeholder={p.placeholder}
								defaultValue={answer.sentence?.[p.key] ?? ''}
								onBlur={(e) => save(setSentencePart(p.key, e.target.value))}
							/>
						</div>
					))}
					{Object.values(answer.sentence ?? {}).some((v) => v?.trim()) && (
						<p className="m-0 p-3.5 rounded-[10px] bg-canvas font-serif italic text-[15px] leading-relaxed">
							&ldquo;{step.sentence.render(answer.sentence ?? {})}&rdquo;
						</p>
					)}
				</div>
			)}

			{step.ranked && (
				<div className="flex flex-col gap-4">
					{ranked.map((entry, i) => (
						<div key={i} className="p-4 rounded-[10px] border border-line bg-canvas">
							<div className="flex items-center justify-between gap-2 mb-3">
								<span className="font-serif font-semibold text-accent">#{i + 1}</span>
								<button type="button" className={deleteBtn} aria-label="Remove entry" onClick={() => removeRankedEntry(i)}>×</button>
							</div>
							<div className="grid gap-2.5">
								{step.ranked!.parts.map((p) => (
									<div key={p.key}>
										<label className={labelClass} htmlFor={`ranked-${i}-${p.key}`}>{p.label}</label>
										<input
											id={`ranked-${i}-${p.key}`}
											type="text"
											className={input}
											placeholder={p.placeholder}
											defaultValue={entry[p.key] ?? ''}
											onBlur={(e) => save(setRankedPart(i, p.key, e.target.value))}
										/>
									</div>
								))}
							</div>
							{Object.values(entry).some((v) => v?.trim()) && (
								<p className="mt-3 mb-0 p-3 rounded-lg bg-paper font-serif italic text-sm leading-relaxed">
									&ldquo;{step.ranked!.render(entry)}&rdquo;
								</p>
							)}
						</div>
					))}
					{ranked.length < step.ranked.max && (
						<button type="button" className={`${input} text-left text-muted cursor-pointer w-fit px-4`} onClick={addRankedEntry}>
							+ Add another ({ranked.length}/{step.ranked.max})
						</button>
					)}
				</div>
			)}
		</div>
	);
}
