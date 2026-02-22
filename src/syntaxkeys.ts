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

	// String Like OP ~~ ~~* !~~ !~~* ~ ~*
	likeL : string;
	likeR : string;
	softLikeL : string;
	softLikeR : string;
	dislikeL : string;
	dislikeR : string;
	softDislikeL : string;
	softDislikeR : string;
	regexLikeL : string;
	regexLikeR : string;
	arrayLikeL : string;
	arrayLikeR : string;
	arraySoftLikeL : string;
	arraySoftLikeR : string;
	arrayDislikeL : string;
	arrayDislikeR : string;
	arraySoftDislikeL : string;
	arraySoftDislikeR : string;
	arrayRegexLikeL : string;
	arrayRegexLikeR : string;

	// Equality OP = <> !=
	equalityL : string;
	equalityR : string;
	inequalityL : string;
	inequalityR : string;
	arrayEqualityL : string;
	arrayEqualityR : string;
	arrayInequalityL : string;
	arrayInequalityR : string;


	// Comparison OP > >= < <=
	softSuperiorL : string;
	softSuperiorR : string;
	softInferiorL : string;
	softInferiorR : string;
	strictSuperiorL : string;
	strictSuperiorR : string;
	strictInferiorL : string;
	strictInferiorR : string;
	arraySoftSuperiorL : string;
	arraySoftSuperiorR : string;
	arraySoftInferiorL : string;
	arraySoftInferiorR : string;
	arrayStrictSuperiorL : string;
	arrayStrictSuperiorR : string;
	arrayStrictInferiorL : string;
	arrayStrictInferiorR : string;
};


export type SKLikeOP<SK extends SyntaxKeys> = SK["likeL" | "likeR" | "softLikeL" | "softLikeR" | "dislikeL" | "dislikeR" | "softDislikeL" | "softDislikeR" | "regexLikeL" | "regexLikeR"]; 
export type SKArrayLikeOP<SK extends SyntaxKeys> = SK["arrayLikeL" |"arrayLikeR" |"arraySoftLikeL" |"arraySoftLikeR" |"arrayDislikeL" |"arrayDislikeR" |"arraySoftDislikeL" |"arraySoftDislikeR" |"arrayRegexLikeL" |"arrayRegexLikeR"];

export type SKEqualityOPL<SK extends SyntaxKeys> = SK[ "equalityL" | "inequalityL" ];
export type SKEqualityOPR<SK extends SyntaxKeys> = SK[ "equalityR" | "inequalityR" ];
export type SKArrayEqualityOP<SK extends SyntaxKeys> = SK[ "arrayEqualityL" | "arrayEqualityR" | "arrayInequalityL" | "arrayInequalityR" ];

export type SKCompareOP<SK extends SyntaxKeys> = SK["softSuperiorL" | "softSuperiorR" | "softInferiorL" | "softInferiorR" | "strictSuperiorL" | "strictSuperiorR" | "strictInferiorL" | "strictInferiorR"]; 
export type SKArrayCompareOP<SK extends SyntaxKeys> = SK["arraySoftSuperiorL" | "arraySoftSuperiorR" | "arraySoftInferiorL" | "arraySoftInferiorR" | "arrayStrictSuperiorL" | "arrayStrictSuperiorR" | "arrayStrictInferiorL" | "arrayStrictInferiorR"]; 



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
	inequalityL : string | string[];
	inequalityR : string | string[];
	compareL : string | string[];
	compareR : string | string[];
	arrayLikeL : string | string[];
	arrayLikeR : string | string[];
	arrayEqualityL : string | string[];
	arrayEqualityR : string | string[];
	arrayInequalityL : string | string[];
	arrayInequalityR : string | string[];
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
	equalityL : '=:',
	equalityR : '',
	inequalityL : ['<>:', '!=:'],
	inequalityR : '',
	compareL : ['>:', '>=:', '<:', '<=:'],
	compareR : '',
	arrayLikeL : ['[~~]:', '[~~*]:', '[!~~]:', '[!~~*]:', '[~]:', '[~*]:'],
	arrayLikeR : '',
	arrayEqualityL : '[=]:',
	arrayEqualityR : '',
	arrayInequalityL : ['[<>]:', '[!=]:'],
	arrayInequalityR : '',
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
	equalityR : ' =',
	inequalityL : '',
	inequalityR : [' <>', ' !='],
	compareL : '',
	compareR : [' >', ' >=', ' <', ' <='],
	arrayLikeL : '[',
	arrayLikeR : ['] ~~', '] ~~*', '] !~~', '] !~~*', '] ~', '] ~*'],
	arrayEqualityL : '[',
	arrayEqualityR : '] =',
	arrayInequalityL : '[',
	arrayInequalityR : ['] <>', '] !='],
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