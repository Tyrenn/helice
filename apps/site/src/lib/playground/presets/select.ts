import { Helice } from 'helice';

type User = { id: number; name: string; email: string; active: boolean };
type Post = { id: number; author_id: number; title: string; published: boolean; views: number };

const db = new Helice<{ user: User; post: Post }>();

// Everything you export shows up on the right.
// Try a wrong table name, or a string for views.
export const popular = db.select('post')
	.field(['id', 'title'])
	.where({ published: true, '>=:views': 500 })
	.orderBy({ views: 'DESC' })
	.limit(10)
	.build();
