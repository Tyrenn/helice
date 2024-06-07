/****************
		ORDER BY
*****************/

/**
 * Transform every properties of an object to string if not object
 */
	export type OrderBy<T = any> = {
		[Prop in keyof T]? : "DESC" | "" | "ASC";
	}

	export type OrderByFromArray<T extends string[]> = {
		[Prop in T[number]]? : "DESC" | "" | "ASC" | undefined;
	}

