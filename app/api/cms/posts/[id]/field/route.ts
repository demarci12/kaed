import { createFieldRoute } from '@/lib/field-route';
import { slugify } from '@/lib/cms';

/** Inline edits to a post. `slug` is normalised; `keywords` arrives as a comma-separated string. */
export const POST = createFieldRoute({
	table: 'cms_posts',
	ownerOnly: true,
	touchUpdatedAt: true,
	fields: {
		title: { kind: 'text', required: true, label: 'Title' },
		slug: { kind: 'text', required: true, label: 'Slug' },
		description: { kind: 'text' },
		excerpt: { kind: 'text' },
		body_md: { kind: 'text' },
		cover_image_url: { kind: 'text' },
		cover_alt: { kind: 'text' },
		keywords: { kind: 'text' },
	},
	onWrite: (field, value, update) => {
		if (field === 'slug') update.slug = slugify(value);
		if (field === 'keywords') update.keywords = value.split(',').map((k) => k.trim()).filter(Boolean);
		if (field === 'body_md') update.body_md = value;
	},
});
