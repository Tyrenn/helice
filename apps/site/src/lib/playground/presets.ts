import select from './presets/select.ts?raw';
import join from './presets/join.ts?raw';
import prepare from './presets/prepare.ts?raw';
import writes from './presets/writes.ts?raw';
import verbose from './presets/verbose.ts?raw';
import cte from './presets/cte.ts?raw';

export const presets = [
	{id : 'select', label : 'Select', code : select},
	{id : 'join', label : 'Join & aggregate', code : join},
	{id : 'prepare', label : 'Runtime values', code : prepare},
	{id : 'writes', label : 'Insert, update, delete', code : writes},
	{id : 'verbose', label : 'Verbose syntax', code : verbose},
	{id : 'cte', label : 'CTE', code : cte}
];
