import { highlight } from '#lib/server/content.ts';

// Quoted from the home page of Mousse
const mousseExample = `new Mousse()
	.get('/users/:id', (c) => ({ id: c.param('id') }))
	.sse('/events', (c) => c.send('welcome'))
	.listen(3000);`;

// The contributing steps of the README
const setup = `git clone https://github.com/<you>/helice
cd helice && pnpm install
git checkout -b my-change`;

const check = 'pnpm build && pnpm check-types && pnpm test';

const changeset = 'pnpm changeset';

export function load(){
	return {
		mousse : highlight(mousseExample, 'ts'),
		contributing : {
			setup : highlight(setup, 'sh'),
			check : highlight(check, 'sh'),
			changeset : highlight(changeset, 'sh')
		}
	};
}
