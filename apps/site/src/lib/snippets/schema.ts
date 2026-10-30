import { Helice, VerboseSyntaxKeys } from 'helice';

export type User = { id: number; name: string; email: string; active: boolean };
export type Post = { id: number; author_id: number; title: string; published: boolean; views: number };

export type Database = { user: User; post: Post };

export const db = new Helice<Database>();
export const verbose = new Helice<Database, VerboseSyntaxKeys>(VerboseSyntaxKeys);
