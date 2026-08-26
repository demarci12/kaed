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

// Grouped short labels ("Pain · Work · Mine") for the pill UI itself, kept
// terse so a row of pills reads at a glance -- grouping still shows via
// IDEA_CATEGORY_LABELS wherever a fuller label is wanted (e.g. dropdowns).
export const IDEA_CATEGORY_PILL_LABELS: Record<IdeaCategory, string> = {
	'work-mine': 'Work · Mine',
	'work-others': "Work · Others'",
	'life-mine': 'Life · Mine',
	'life-known': 'Life · Known',
	'life-strangers': 'Life · Strangers',
	'tech-app': 'Tech · App',
	'clone-niche': 'Clone · Niche',
	'clone-geo': 'Clone · Geo',
	'clone-pricing': 'Clone · Pricing',
	'clone-usecase': 'Clone · Use case',
	'clone-oss': 'Clone · OSS',
};

export const IDEA_CATEGORIES = Object.keys(IDEA_CATEGORY_PILL_LABELS) as IdeaCategory[];

export type OplStatus = 'open' | 'in_progress' | 'closed';

export const OPL_STATUS_LABELS: Record<OplStatus, string> = {
	open: 'Open',
	in_progress: 'In progress',
	closed: 'Closed',
};

export interface Idea {
	id: string;
	user_id: string;
	title: string;
	body: string | null;
	category: IdeaCategory | null;
	status: OplStatus;
	contributors: string | null;
	business_idea_id: string | null;
	created_at: string;
}
