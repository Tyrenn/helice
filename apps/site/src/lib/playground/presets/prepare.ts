import { Helice } from 'helice';

type Post = { id: number; author_id: number; title: string; published: boolean; views: number };

const db = new Helice<{ post: Post }>();

// Compiled once, called as many times as you need
const findPosts = db.select('post')
	.where({ published: true })
	.prepare({ where: true, limit: true });

export const first = findPosts({ where: { '>=:views': 500 }, limit: 10 });
export const second = findPosts({ where: { '~~:title': '%SQL%' }, limit: 3 });

// Runtime values can be restricted to some columns
const rename = db.update('post')
	.prepare({ set: true, where: { post: ['id'] } });

export const renamed = rename({ set: { title: 'Hello' }, where: { id: 10 } });
