import { Helice } from "../src/index.js";
import { VerboseSyntaxKeys } from "../src/syntaxkeys.js";

export type User = {
	id     : number;
	name   : string;
	email  : string;
	active : boolean;
};

export type Post = {
	id        : number;
	author_id : number;
	title     : string;
	content   : string;
	published : boolean;
	views     : number;
	tags      : string[];
};

export type Comment = {
	id        : number;
	post_id   : number;
	author_id : number;
	body      : string;
};

// Virtual type used as a CTE alias
export type ActiveUser = {
	id   : number;
	name : string;
};

export type BlogEnv = {
	user        : User;
	post        : Post;
	comment     : Comment;
	active_user : ActiveUser;
};

export const db        = new Helice<BlogEnv>();
export const verboseDb = new Helice<BlogEnv, VerboseSyntaxKeys>(VerboseSyntaxKeys);

export type Case = {
	label    : string;
	fn       : () => { query: string; args: any[] };
	expected : { query: string; args: any[] };
};
