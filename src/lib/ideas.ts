export type IdeaCategory =
	| 'work-mine'
	| 'work-others'
	| 'life-mine'
	| 'life-known'
	| 'life-strangers'
	| 'tech-app'
	| 'clone-niche'
	| 'clone-geo'
	| 'clone-pricing'
	| 'clone-usecase'
	| 'clone-oss';

// Leaf labels from the pain/technology/clone idea-generation taxonomy.
export const IDEA_CATEGORY_LABELS: Record<IdeaCategory, string> = {
	'work-mine': 'Pain · Work · Mine',
	'work-others': "Pain · Work · Others'",
	'life-mine': 'Pain · Life · Mine',
	'life-known': 'Pain · Life · People I know',
	'life-strangers': "Pain · Life · People I don't know",
	'tech-app': 'Technology · Application',
	'clone-niche': 'Clone · New niche',
	'clone-geo': 'Clone · New geography',
	'clone-pricing': 'Clone · New pricing',
	'clone-usecase': 'Clone · New use case',
	'clone-oss': 'Clone · OSS',
};

export interface Idea {
	id: string;
	user_id: string;
	title: string;
	body: string | null;
	category: IdeaCategory | null;
	business_idea_id: string | null;
	created_at: string;
}
