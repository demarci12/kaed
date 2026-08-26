import type { IdeaCategory } from './ideas';

export interface BusinessIdea {
	id: string;
	user_id: string;
	title: string;
	pain_point: string | null;
	target_market: string | null;
	validation: string | null;
	category: IdeaCategory | null;
	rank: number;
	created_at: string;
	updated_at: string;
}
