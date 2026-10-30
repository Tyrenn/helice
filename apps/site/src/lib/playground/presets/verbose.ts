import { Helice, VerboseSyntaxKeys } from 'helice';

type User = { id: number; name: string; active: boolean };
type Post = { id: number; author_id: number; title: string; views: number };

// The vocabulary of the keys changes, the SQL doesn't
const db = new Helice<{ user: User; post: Post }, VerboseSyntaxKeys>(VerboseSyntaxKeys);

export const popular = db.select('post')
	.join({ 'INNER JOIN user': 'id = post.author_id' })
	.field({ postId: 'post.id', author: 'user.name' })
	.where({ 'post.views >=': 500, 'post.title ~~': '%hello%' })
	.build();
