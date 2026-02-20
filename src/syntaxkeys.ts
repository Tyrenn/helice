/* =========================================================================
   =  Default Syntax Keys
   ========================================================================= */


export type SyntaxKeys = {

	// Used in join
	join : string;
	defaultJoin : string;
	innerJoin : string;
	fullJoin : string;
	leftJoin : string;
	rightJoin : string;

	// Used everywhere
	alias : string;
	andGroup : string;

	// Used in Where
	aggregationL : string;
	aggregationR : string;
	jsonL : string;
	jsonR : string;
	rawL : string;
	rawR : string;
	tsqueryL : string;
	tsqueryR : string;

	// Operators
	likeL : string;
	likeR : string;
	equalityL : string;
	equalityR : string;
	compareL : string;
	compareR : string;
	arrayLikeL : string;
	arrayLikeR : string;
	arrayEqualityL : string;
	arrayEqualityR : string;
	arrayCompareL: string;
	arrayCompareR: string;
};

export type SyntaxKeysConstant = {

	// Used in join
	join : string;
	defaultJoin : string;
	innerJoin : string;
	fullJoin : string;
	leftJoin : string;
	rightJoin : string;

	// Used everywhere
	alias : string;
	andGroup : string;

	// Used in Where
	aggregationL : string;
	aggregationR : string;
	jsonL : string;
	jsonR : string;
	rawL : string;
	rawR : string;

	// Operators
	tsqueryL : string;
	tsqueryR : string;
	likeL : string | string[];
	likeR : string | string[];
	equalityL : string | string[];
	equalityR : string | string[];
	compareL : string | string[];
	compareR : string | string[];
	arrayLikeL : string | string[];
	arrayLikeR : string | string[];
	arrayEqualityL : string | string[];
	arrayEqualityR : string | string[];
	arrayCompareL: string | string[];
	arrayCompareR: string | string[];
}


export type ToSyntaxKey<SKC extends any> = {
	[k in keyof SKC] : SKC[k] extends readonly string[] ? SKC[k][number] : SKC[k];
}




export const DefaultSyntaxKeys = {
	join : "#",
	defaultJoin : " # ",
	innerJoin : " i# ",
	fullJoin : " f# ",
	leftJoin : " l# ",
	rightJoin : " r# ",

	alias : "@",
	andGroup : "&&:",
	
	aggregationL : "[]:",
	aggregationR : "",
	jsonL : "{}:",
	jsonR : "",
	rawL : "sql:",
	rawR : "",

	likeL : ['~~:', '~~*:', '!~~:', '!~~*:', '~:', '~*:'],
	likeR : '',
	equalityL : ['=:', '<>:', '!=:'],
	equalityR : '',
	compareL : ['>:', '>=:', '<:', '<=:'],
	compareR : '',
	arrayLikeL : ['[~~]:', '[~~*]:', '[!~~]:', '[!~~*]:', '[~]:', '[~*]:'],
	arrayLikeR : '',
	arrayEqualityL : ['[=]:', '[<>]:', '[!=]:'],
	arrayEqualityR : '',
	arrayCompareL :  ['[>]:', '[>=]:', '[<]:', '[<=]:'],
	arrayCompareR : '',
	tsqueryL : "@@:",
	tsqueryR : "",
} as const satisfies SyntaxKeysConstant;

export type DefaultSyntaxKeys = ToSyntaxKey<typeof DefaultSyntaxKeys> & {};



export const VerboseSyntaxKeys = {
	join : "JOIN",
	defaultJoin : " JOIN ",
	innerJoin : " INNER JOIN ",
	fullJoin : " FULL JOIN ",
	leftJoin : " LEFT JOIN ",
	rightJoin : " RIGHT JOIN ",

	alias : " AS ",
	
	aggregationL : "agg(",
	aggregationR : ")",
	jsonL : "json(",
	jsonR : ")",
	rawL : "sql(",
	rawR : ")",
	andGroup : "AND",

	tsqueryL : "",
	tsqueryR : " @@",
	likeL : '',
	likeR : [' ~~', ' ~~*', ' !~~', ' !~~*', ' ~', ' ~*'],
	equalityL : '',
	equalityR : [' =', ' <>', ' !='],
	compareL : '',
	compareR : [' >', ' >=', ' <', ' <='],
	arrayLikeL : '[',
	arrayLikeR : ['] ~~', '] ~~*', '] !~~', '] !~~*', '] ~', '] ~*'],
	arrayEqualityL : '[',
	arrayEqualityR : ['] =', '] <>', '] !='],
	arrayCompareL :  '[',
	arrayCompareR : ['] >', '] >=', '] <', '] <='],
} as const satisfies SyntaxKeysConstant;

export type VerboseSyntaxKeys = ToSyntaxKey<typeof VerboseSyntaxKeys> & {};


/// DEFINE SYNTAX KEYS ?
// # i# f# l# r#   =>  join
// @					 =>  alias
// :					 =>  operator separator
// {}				 	 =>  json build object
// []				 	 =>  agg
// &&					 =>  AND group
// @@					 =>  TSQuery