import { db } from './schema.ts';

export const { query, args } = db.select('post')
	.field(['id', 'title'])
	.where({
		published : true,
		'&&:any'  : [
			{ '~~:title': '%TypeScript%' },
			{ '>=:views': 1000 },
		]
	})
	.orderBy({ views: 'DESC' })
	.limit(10)
	.build();
