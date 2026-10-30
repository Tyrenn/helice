import { Helice } from 'helice';

// Your schema, as plain TypeScript types
type User = { id: number; name: string; active: boolean };
type Post = { author_id: number; title: string; views: number };

const db = new Helice<{ user: User; post: Post }>();

export const { query, args } = db.select('post')
	.join({ 'i#user': 'id = post.author_id' })
	.field({ title: 'post.title', author: 'user.name' })
	.where({ 'user.active': true, '>=:post.views': 500 })
	.orderBy({ 'post.views': 'DESC' })
	.limit(10)
	.build();
