'use client';

import { createContext, useContext, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Source offset of the task-list item being rendered, so a click can find its `[ ]`. */
const TaskOffset = createContext<number | null>(null);

function TaskBox({ checked, onToggle }: { checked: boolean; onToggle?: (offset: number) => void }) {
	const offset = useContext(TaskOffset);
	return (
		<input
			type="checkbox"
			checked={checked}
			disabled={offset == null || !onToggle}
			onChange={() => offset != null && onToggle?.(offset)}
			className="mt-1.5 shrink-0 accent-[var(--color-ink,currentColor)] cursor-pointer"
		/>
	);
}

/**
 * Renders a section's markdown as formatted text. Styled with plain utilities
 * (no typography plugin), matching the rest of the app's "no hand-written CSS"
 * rule. Task-list boxes are live when `onToggle` is given: it receives the
 * source offset of the item so the caller can flip that `[ ]`/`[x]`.
 */
export function Markdown({ children, onToggle }: { children: string; onToggle?: (offset: number) => void }) {
	const components: Components = {
		h1: ({ children }) => <h1 className="font-serif text-2xl font-semibold mt-8 mb-3">{children}</h1>,
		h2: ({ children }) => <h2 className="font-serif text-xl font-semibold mt-8 mb-3">{children}</h2>,
		h3: ({ children }) => <h3 className="font-serif text-lg font-semibold mt-7 mb-2">{children}</h3>,
		h4: ({ children }) => <h4 className="font-semibold mt-5 mb-1.5">{children}</h4>,
		p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
		ul: ({ children, className }) => (
			<ul className={className?.includes('contains-task-list') ? 'my-3 pl-0 list-none space-y-1.5' : 'my-3 pl-6 list-disc space-y-1.5 marker:text-muted'}>{children}</ul>
		),
		ol: ({ children }) => <ol className="my-3 pl-6 list-decimal space-y-1.5 marker:text-muted">{children}</ol>,
		li: ({ node, className, children }) =>
			className?.includes('task-list-item') ? (
				<TaskOffset.Provider value={node?.position?.start.offset ?? null}>
					<li className="flex items-start gap-2.5 leading-relaxed">{children as ReactNode}</li>
				</TaskOffset.Provider>
			) : (
				<li className="leading-relaxed pl-0.5">{children}</li>
			),
		input: ({ type, checked }) => (type === 'checkbox' ? <TaskBox checked={Boolean(checked)} onToggle={onToggle} /> : null),
		blockquote: ({ children }) => (
			<blockquote className="my-5 pl-4 pr-3 py-1 border-l-[3px] border-ink bg-canvas rounded-r-lg [&>p]:my-2">{children}</blockquote>
		),
		hr: () => <hr className="my-8 border-0 border-t border-line" />,
		a: ({ href, children }) => (
			<a href={href} className="text-ink underline underline-offset-2 decoration-line hover:decoration-ink" {...(href?.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
				{children}
			</a>
		),
		strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
		code: ({ children }) => <code className="font-mono text-[13px] bg-canvas border border-line rounded px-1 py-px">{children}</code>,
		table: ({ children }) => (
			<div className="my-5 overflow-x-auto border border-line rounded-[10px]">
				<table className="w-full text-sm border-collapse">{children}</table>
			</div>
		),
		thead: ({ children }) => <thead className="bg-canvas">{children}</thead>,
		th: ({ children }) => <th className="text-left font-semibold px-3.5 py-2.5 border-b border-line whitespace-nowrap">{children}</th>,
		td: ({ children }) => <td className="px-3.5 py-2.5 border-b border-line align-top leading-relaxed">{children}</td>,
	};

	return (
		<div className="text-[15px] text-ink [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
			<ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
				{children}
			</ReactMarkdown>
		</div>
	);
}
