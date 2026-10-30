import { Helice } from 'helice';

type User = { id: number; name: string; active: boolean };
type Post = { id: number; author_id: number; title: string; views: number };
type Comment = { id: number; post_id: number; body: string };

const db = new Helice<{ user: User; post: Post; comment: Comment }>();

export const postsWithComments = db.select('post')
	.join({ 'i#user': 'id = post.author_id', comment: 'post_id = post.id' })
	.field({
		postId   : 'post.id',
		author   : 'user.name',
		comments : {
			fn    : 'json_agg',
			group : ['post.id', 'user.name'],
			value : { id: 'comment.id', body: 'comment.body' }
		}
	})
	.where({ 'user.active': true })
	.build();
