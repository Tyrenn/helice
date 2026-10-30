import { verbose } from './schema.ts';

export const { query, args } = verbose.select('post')
	.join({ 'INNER JOIN user': 'id = post.author_id' })
	.field({ postId: 'post.id', author: 'user.name' })
	.where({ 'post.views >=': 500, 'post.title ~~': '%hello%' })
	.build();
