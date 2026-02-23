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
	softRegexLikeL : string;
	softRegexLikeR : string;
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
	arraySoftRegexLikeL : string;
	arraySoftRegexLikeR : string;

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


export type SKLikeOPL<SK extends SyntaxKeys> = SK["likeL" | "softLikeL" | "dislikeL" | "softDislikeL" | "regexLikeL" | "softRegexLikeL"]; 
export type SKLikeOPR<SK extends SyntaxKeys> = SK["likeR" | "softLikeR" | "dislikeR" | "softDislikeR" | "regexLikeR" | "softRegexLikeR"]; 
export type SKArrayLikeOPL<SK extends SyntaxKeys> = SK["arrayLikeL" |"arraySoftLikeL" | "arrayDislikeL" | "arraySoftDislikeL" | "arrayRegexLikeL" | "arraySoftRegexLikeL" ];
export type SKArrayLikeOPR<SK extends SyntaxKeys> = SK["arrayLikeR" |"arraySoftLikeR" | "arrayDislikeR" | "arraySoftDislikeR" | "arrayRegexLikeR" | "arraySoftRegexLikeR" ];

export type SKEqualityOPL<SK extends SyntaxKeys> = SK[ "equalityL" | "inequalityL" ];
export type SKEqualityOPR<SK extends SyntaxKeys> = SK[ "equalityR" | "inequalityR" ];
export type SKArrayEqualityOPL<SK extends SyntaxKeys> = SK[ "arrayEqualityL" | "arrayInequalityL"];
export type SKArrayEqualityOPR<SK extends SyntaxKeys> = SK[ "arrayEqualityR" | "arrayInequalityR" ];

export type SKCompareOPL<SK extends SyntaxKeys> = SK[ "softSuperiorL" | "softInferiorL" | "strictSuperiorL" | "strictInferiorL" ]; 
export type SKCompareOPR<SK extends SyntaxKeys> = SK[ "softSuperiorR" | "softInferiorR" | "strictSuperiorR" | "strictInferiorR" ]; 
export type SKArrayCompareOPL<SK extends SyntaxKeys> = SK[ "arraySoftSuperiorL" | "arraySoftInferiorL" | "arrayStrictSuperiorL" | "arrayStrictInferiorL" ]; 
export type SKArrayCompareOPR<SK extends SyntaxKeys> = SK[ "arraySoftSuperiorR" | "arraySoftInferiorR" | "arrayStrictSuperiorR" | "arrayStrictInferiorR" ]; 



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
	tsqueryL : string;
	tsqueryR : string;

	// String Like OP
	likeL : string | string[];
	likeR : string | string[];
	softLikeL : string | string[];
	softLikeR : string | string[];
	dislikeL : string | string[];
	dislikeR : string | string[];
	softDislikeL : string | string[];
	softDislikeR : string | string[];
	regexLikeL : string | string[];
	regexLikeR : string | string[];
	softRegexLikeL : string | string[];
	softRegexLikeR : string | string[];
	arrayLikeL : string | string[];
	arrayLikeR : string | string[];
	arraySoftLikeL : string | string[];
	arraySoftLikeR : string | string[];
	arrayDislikeL : string | string[];
	arrayDislikeR : string | string[];
	arraySoftDislikeL : string | string[];
	arraySoftDislikeR : string | string[];
	arrayRegexLikeL : string | string[];
	arrayRegexLikeR : string | string[];
	arraySoftRegexLikeL : string | string[];
	arraySoftRegexLikeR : string | string[];

	// Equality OP =
	equalityL : string | string[];
	equalityR : string | string[];
	inequalityL : string | string[];
	inequalityR : string | string[];
	arrayEqualityL : string | string[];
	arrayEqualityR : string | string[];
	arrayInequalityL : string | string[];
	arrayInequalityR : string | string[];


	// Comparison OP >
	softSuperiorL : string | string[];
	softSuperiorR : string | string[];
	softInferiorL : string | string[];
	softInferiorR : string | string[];
	strictSuperiorL : string | string[];
	strictSuperiorR : string | string[];
	strictInferiorL : string | string[];
	strictInferiorR : string | string[];
	arraySoftSuperiorL : string | string[];
	arraySoftSuperiorR : string | string[];
	arraySoftInferiorL : string | string[];
	arraySoftInferiorR : string | string[];
	arrayStrictSuperiorL : string | string[];
	arrayStrictSuperiorR : string | string[];
	arrayStrictInferiorL : string | string[];
	arrayStrictInferiorR : string | string[];
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
	tsqueryL: '@@:',
	tsqueryR: '',

	likeL: '~~:',
	likeR: '',
	softLikeL: '~~*:',
	softLikeR: '',
	dislikeL: '!~~:',
	dislikeR: '',
	softDislikeL: '!~~*:',
	softDislikeR: '',
	regexLikeL: '~:',
	regexLikeR: '',
	softRegexLikeL: '~*:',
	softRegexLikeR: '',
	arrayLikeL: '[~~]:',
	arrayLikeR: '',
	arraySoftLikeL: '[~~*]:', 
	arraySoftLikeR: '',
	arrayDislikeL: '[!~~]:',
	arrayDislikeR: '',
	arraySoftDislikeL: '[!~~*]:', 
	arraySoftDislikeR: '',
	arrayRegexLikeL: '[~]:',
	arrayRegexLikeR: '',
	arraySoftRegexLikeL: '[~*]:', 
	arraySoftRegexLikeR: '',

	equalityL: '=:',
	equalityR: '',
	inequalityL: ['<>:', '!=:'],
	inequalityR: '',
	arrayEqualityL: '[=]:',
	arrayEqualityR: '',
	arrayInequalityL: ['[<>]:', '[!=]:'],
	arrayInequalityR: '',

	softSuperiorL: '>=:',
	softSuperiorR: '',
	softInferiorL: '<=:',
	softInferiorR: '',
	strictSuperiorL: '>:',
	strictSuperiorR: '',
	strictInferiorL: '<:',
	strictInferiorR : '',
	arraySoftSuperiorL: '[>=]:',
	arraySoftSuperiorR: '',
	arraySoftInferiorL: '[<=]:',
	arraySoftInferiorR: '',
	arrayStrictSuperiorL: '[>]:',
	arrayStrictSuperiorR: '',
	arrayStrictInferiorL: '[<]:',
	arrayStrictInferiorR: '',
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