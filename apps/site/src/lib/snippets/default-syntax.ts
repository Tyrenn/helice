import { db } from './schema.ts';

export const { query, args } = db.select('post')
	.join({ 'i#user': 'id = post.author_id' })
	.field({ postId: 'post.id', author: 'user.name' })
	.where({ '>=:post.views': 500, '~~:post.title': '%hello%' })
	.build();
