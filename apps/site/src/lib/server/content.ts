import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import hljs from 'highlight.js';
import { Marked, type Tokens } from 'marked';

const GITHUB = 'https://github.com/Tyrenn/helice';

// Builds run from apps/site : the README and documentation/ stay the single source of the content
const repoFile = (...path : string[]) => readFileSync(join(process.cwd(), '..', '..', ...path), 'utf8').replace(/\r\n/g, '\n');

const escapeHtml = (text : string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function highlight(code : string, language? : string){
	const name = language?.split(/\s/)[0];
	const html = name && hljs.getLanguage(name) ? hljs.highlight(code, {language : name}).value : escapeHtml(code);
	return `<code class="hljs">${html}</code>`;
}

export type DocEntry = {slug : string, title : string, description : string};

// Pages cut out of the README, in reading order
const guides : (DocEntry & {sections : string[]})[] = [
	{slug : 'getting-started', title : 'Getting started', description : 'Install, describe your schema, choose your syntax.', sections : ['Quick start', 'Concepts']},
	{slug : 'clauses', title : 'Clauses', description : 'field, where, join, orderBy and returning.', sections : ['Clauses']},
	{slug : 'queries', title : 'Queries', description : 'What each query type accepts, prepare, build and execute.', sections : ['Queries']}
];

/**
 * After the guides, the documentation order comes from the README index
 */
export function docEntries() : DocEntry[] {
	const entries = [...repoFile('README.md').matchAll(/^>- #### \[(.+?)\]\(\.\/documentation\/(.+?)\.md\) — (.+)$/gm)]
		.map(([, title, slug, description]) => ({slug, title, description}));

	if(entries.length === 0)
		throw new Error('No documentation entry found in the README index');

	return [...guides.map(({slug, title, description}) => ({slug, title, description})), ...entries];
}

function readmeSection(name : string){
	const section = repoFile('README.md').split(/^## /m).find((part) => part.startsWith(`${name}\n`));

	if(!section)
		throw new Error(`No "${name}" section found in the README`);

	return `## ${section}`;
}

function docSource(slug : string){
	const guide = guides.find((other) => other.slug === slug);

	if(!guide)
		return repoFile('documentation', `${slug}.md`);

	// A single section is the whole page : its title is the page title, and its subsections move up a level
	if(guide.sections.length === 1)
		return readmeSection(guide.sections[0]).replace(/^## .*\n/, '').replace(/^#(#{2,}) /gm, '$1 ');

	return guide.sections.map(readmeSection).join('\n');
}

function plainText(html : string){
	return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

// Same ids as GitHub : docs link to each other's sections
function slugify(text : string){
	return text.toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
}

// Links are relative : every documentation page sits at /docs/<slug>/, whatever the base path
function rewriteHref(href : string){
	if(/^([a-z]+:|#)/.test(href))
		return href;

	const [path, hash] = href.split('#');
	const anchor = hash ? `#${hash}` : '';

	// The documentation only points at the clause reference of the README
	if(path === '../README.md')
		return `../clauses/${anchor}`;

	const page = path.match(/^\.\/documentation\/(.+)\.md$/)?.[1] ?? path.match(/^\.\/(.+)\.md$/)?.[1];
	if(page)
		return `../${page}/${anchor}`;

	const target = path.replace(/^(\.\.?\/)+/, '');
	return `${GITHUB}/${/\.\w+$/.test(target) ? 'blob' : 'tree'}/main/${target}${anchor}`;
}

export type RenderedDoc = {title : string, html : string, toc : {id : string, text : string}[]};

export function renderDoc(slug : string) : RenderedDoc {
	const toc : RenderedDoc['toc'] = [];
	const seen = new Map<string, number>();
	let title = docEntries().find((entry) => entry.slug === slug)?.title ?? slug;

	const marked = new Marked({
		walkTokens(token){
			if(token.type === 'link')
				(token as Tokens.Link).href = rewriteHref((token as Tokens.Link).href);
		},
		renderer : {
			heading({tokens, depth}){
				const html = this.parser.parseInline(tokens);
				const text = plainText(html);

				if(depth === 1){
					title = text;
					return '';
				}

				const base = slugify(text);
				const count = seen.get(base) ?? 0;
				seen.set(base, count + 1);
				const id = count ? `${base}-${count}` : base;

				if(depth === 2)
					toc.push({id, text});

				// A heading holding a link can't be a link itself
				return html.includes('<a ')
					? `<h${depth} id="${id}">${html}</h${depth}>\n`
					: `<h${depth} id="${id}"><a href="#${id}">${html}</a></h${depth}>\n`;
			},
			code({text, lang}){
				return `<div class="code"><pre>${highlight(text, lang)}</pre><button type="button" class="copy" aria-label="Copy code">Copy</button></div>\n`;
			}
		}
	});

	const html = (marked.parse(docSource(slug)) as string)
		.replace(/<table>/g, '<div class="table-wrap"><table>')
		.replace(/<\/table>/g, '</table></div>');

	return {title, html, toc};
}
