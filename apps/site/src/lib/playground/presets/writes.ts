import { Helice } from 'helice';

type User = { id: number; name: string; email: string; active: boolean };

const db = new Helice<{ user: User }>();

export const inserted = db.insert('user')
	.values({ name: 'Alice', email: 'alice@example.com', active: true })
	.returning(['id', 'name'])
	.build();

export const updated = db.update('user')
	.set({ active: false })
	.where({ id: 5 })
	.returning('*')
	.build();

export const deleted = db.delete('user')
	.where({ active: false })
	.build();
