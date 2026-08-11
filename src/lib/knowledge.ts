export { requireOwner as requireUser } from './auth';

export type KnowledgeKind = 'obsession' | 'skill' | 'experience' | 'strength';

/**
 * Specific knowledge (Naval's framing): the things you can't be trained for
 * — found by following genuine curiosity, and which feel like play to you
 * but look like work to everyone else.
 */
export const KNOWLEDGE_KIND_LABELS: Record<KnowledgeKind, string> = {
	obsession: 'Obsession',
	skill: 'Skill',
	experience: 'Experience',
	strength: 'Strength',
};

export interface KnowledgeCard {
	id: string;
	user_id: string;
	title: string;
	body: string | null;
	evidence: string | null;
	kind: KnowledgeKind | null;
	created_at: string;
	updated_at: string;
}
