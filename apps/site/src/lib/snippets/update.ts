import { db } from './schema.ts';

export const { query, args } = db.update('post')
	.set({ published: true })
	.where({ author_id: 42, '>=:views': 100 })
	.returning({ postId: 'id' })
	.build();
