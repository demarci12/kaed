export { requireOwner as requireUser } from './auth';

export type ActorKind = 'primary' | 'secondary' | 'system';
export type RequirementKind = 'functional' | 'non_functional';
export type RequirementPriority = 'must' | 'should' | 'could' | 'wont';

export const ACTOR_KIND_LABELS: Record<ActorKind, string> = {
	primary: 'Primary',
	secondary: 'Secondary',
	system: 'System',
};

export const REQUIREMENT_KIND_LABELS: Record<RequirementKind, string> = {
	functional: 'Functional',
	non_functional: 'Non-functional',
};

export const REQUIREMENT_PRIORITY_LABELS: Record<RequirementPriority, string> = {
	must: 'Must',
	should: 'Should',
	could: 'Could',
	wont: "Won't",
};

export interface SystemActor {
	id: string;
	project_id: string;
	user_id: string;
	name: string;
	description: string | null;
	kind: ActorKind;
	created_at: string;
}

export interface SystemGoal {
	id: string;
	project_id: string;
	user_id: string;
	title: string;
	description: string | null;
	created_at: string;
}

export interface SystemUseCase {
	id: string;
	project_id: string;
	user_id: string;
	actor_id: string | null;
	title: string;
	description: string | null;
	preconditions: string | null;
	main_flow: string | null;
	postconditions: string | null;
	created_at: string;
}

export interface SystemRequirement {
	id: string;
	project_id: string;
	user_id: string;
	use_case_id: string | null;
	title: string;
	description: string | null;
	kind: RequirementKind;
	priority: RequirementPriority;
	created_at: string;
}
