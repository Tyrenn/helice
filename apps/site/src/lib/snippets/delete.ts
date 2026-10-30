import { db } from './schema.ts';

export const { query, args } = db.delete('post')
	.where({ published: false, '<=:views': 0 })
	.returning(['id', 'title'])
	.build();
