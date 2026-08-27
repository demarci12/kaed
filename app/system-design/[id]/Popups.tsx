'use client';

import { Popup, PopupActions } from '@/components/Popup';
import { ACTOR_KIND_LABELS, REQUIREMENT_KIND_LABELS, REQUIREMENT_PRIORITY_LABELS } from '@/lib/system-design';
import { btnGhost, input, label, textarea } from '@/components/ui';

/**
 * Popup's render-prop API can't cross the server/client boundary, so the four
 * "add" dialogs live here as client components taking plain-data props.
 */
type Option = { id: string; name: string };

export function NewGoalPopup({ projectId }: { projectId: string }) {
	return (
		<Popup title="Add system goal" trigger={(open) => <button type="button" className={btnGhost} onClick={open}>+ Add goal</button>}>
			{(close) => (
				<form method="post" action="/api/system-design/goals/create">
					<input type="hidden" name="project_id" value={projectId} />
					<label className={label} htmlFor="goal-title">Title</label>
					<input className={input} id="goal-title" name="title" type="text" required maxLength={160} />
					<label className={label} htmlFor="goal-description">Description</label>
					<textarea className={textarea} id="goal-description" name="description" rows={3} />
					<PopupActions onCancel={close} submitLabel="Add goal" />
				</form>
			)}
		</Popup>
	);
}

export function NewActorPopup({ projectId }: { projectId: string }) {
	return (
		<Popup title="Add actor" trigger={(open) => <button type="button" className={btnGhost} onClick={open}>+ Add actor</button>}>
			{(close) => (
				<form method="post" action="/api/system-design/actors/create">
					<input type="hidden" name="project_id" value={projectId} />
					<label className={label} htmlFor="actor-name">Name</label>
					<input className={input} id="actor-name" name="name" type="text" required maxLength={160} placeholder="e.g. Customer" />
					<label className={label} htmlFor="actor-kind">Kind</label>
					<select className={input} id="actor-kind" name="kind">
						{Object.entries(ACTOR_KIND_LABELS).map(([value, text]) => (
							<option key={value} value={value}>{text}</option>
						))}
					</select>
					<label className={label} htmlFor="actor-description">Description</label>
					<textarea className={textarea} id="actor-description" name="description" rows={2} />
					<PopupActions onCancel={close} submitLabel="Add actor" />
				</form>
			)}
		</Popup>
	);
}

export function NewUseCasePopup({ projectId, actors }: { projectId: string; actors: Option[] }) {
	return (
		<Popup title="Add use case" trigger={(open) => <button type="button" className={btnGhost} onClick={open}>+ Add use case</button>}>
			{(close) => (
				<form method="post" action="/api/system-design/use-cases/create">
					<input type="hidden" name="project_id" value={projectId} />
					<label className={label} htmlFor="uc-title">Title</label>
					<input className={input} id="uc-title" name="title" type="text" required maxLength={160} placeholder="e.g. Place an order" />
					<label className={label} htmlFor="uc-actor">Actor</label>
					<select className={input} id="uc-actor" name="actor_id" defaultValue="">
						<option value="">No actor</option>
						{actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}
					</select>
					<label className={label} htmlFor="uc-description">Description</label>
					<textarea className={textarea} id="uc-description" name="description" rows={2} />
					<label className={label} htmlFor="uc-preconditions">Preconditions</label>
					<textarea className={textarea} id="uc-preconditions" name="preconditions" rows={2} />
					<label className={label} htmlFor="uc-main-flow">Main flow</label>
					<textarea className={textarea} id="uc-main-flow" name="main_flow" rows={3} />
					<label className={label} htmlFor="uc-postconditions">Postconditions</label>
					<textarea className={textarea} id="uc-postconditions" name="postconditions" rows={2} />
					<PopupActions onCancel={close} submitLabel="Add use case" />
				</form>
			)}
		</Popup>
	);
}

export function NewRequirementPopup({ projectId, useCases }: { projectId: string; useCases: Option[] }) {
	return (
		<Popup title="Add requirement" trigger={(open) => <button type="button" className={btnGhost} onClick={open}>+ Add requirement</button>}>
			{(close) => (
				<form method="post" action="/api/system-design/requirements/create">
					<input type="hidden" name="project_id" value={projectId} />
					<label className={label} htmlFor="req-title">Title</label>
					<input className={input} id="req-title" name="title" type="text" required maxLength={160} />
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className={label} htmlFor="req-kind">Kind</label>
							<select className={input} id="req-kind" name="kind">
								{Object.entries(REQUIREMENT_KIND_LABELS).map(([value, text]) => (
									<option key={value} value={value}>{text}</option>
								))}
							</select>
						</div>
						<div>
							<label className={label} htmlFor="req-priority">Priority</label>
							<select className={input} id="req-priority" name="priority">
								{Object.entries(REQUIREMENT_PRIORITY_LABELS).map(([value, text]) => (
									<option key={value} value={value}>{text}</option>
								))}
							</select>
						</div>
					</div>
					<label className={label} htmlFor="req-use-case">Use case</label>
					<select className={input} id="req-use-case" name="use_case_id" defaultValue="">
						<option value="">No use case</option>
						{useCases.map((useCase) => <option key={useCase.id} value={useCase.id}>{useCase.name}</option>)}
					</select>
					<label className={label} htmlFor="req-description">Description</label>
					<textarea className={textarea} id="req-description" name="description" rows={3} />
					<PopupActions onCancel={close} submitLabel="Add requirement" />
				</form>
			)}
		</Popup>
	);
}
