import { Helice } from 'helice';

type User = { id: number; name: string; active: boolean };
type Post = { id: number; author_id: number; title: string };

const db = new Helice<{ user: User; post: Post }>();

// The alias becomes a table for every query built from "scoped"
const scoped = db.with('active_user', db.select('user').where({ active: true }));

export const fromActiveUsers = scoped.select('post')
	.join({ 'i#active_user': 'id = post.author_id' })
	.field({ title: 'post.title', author: 'active_user.name' })
	.build();
