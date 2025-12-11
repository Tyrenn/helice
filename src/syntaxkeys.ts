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
	separator : string;

	// Used in Where
	aggregation : string;
	json : string;
	raw : string;
	andGroup : string;
	tsquery : string;
}

export type DefaultSyntaxKeys = {
	join : "#",
	defaultJoin : " # ",
	innerJoin : " i# ",
	fullJoin : " f# ",
	leftJoin : " l# ",
	rightJoin : " r# ",

	alias : "@",
	separator : ":",
	
	aggregation : "[]",
	json : "{}",
	raw : "sql",
	andGroup : "&&",
	tsquery : "@@"
};


export type VerboseSyntaxKeys = {
	join : "JOIN",
	defaultJoin : " JOIN ",
	innerJoin : " INNER JOIN ",
	fullJoin : " FULL JOIN ",
	leftJoin : " LEFT JOIN ",
	rightJoin : " RIGHT JOIN ",

	alias : " AS ",
	separator : ":",
	
	aggregation : "agg",
	json : "json",
	raw : "sql",
	andGroup : "AND",
	tsquery : "tsquery"
};

//export type DefaultSyntaxKeys = typeof DefaultSyntaxKeys;


/// DEFINE SYNTAX KEYS ?
// # i# f# l# r#   =>  join
// @					 =>  alias
// :					 =>  operator separator
// {}				 	 =>  json build object
// []				 	 =>  agg
// &&					 =>  AND group
// @@					 =>  TSQuery