import { db } from './schema.ts';

export const { query, args } = db.insert('user')
	.values({ name: 'Alice', email: 'alice@example.com', active: true })
	.returning(['id', 'name'])
	.build();
