const process = require("process");
const fs = require("fs");
const Parser = require("tree-sitter");
const CPP = require("tree-sitter-cpp");
const PYTHON = require("tree-sitter-python");



const openSourceFile = (filePath) => {
	const src = fs.readFileSync(filePath).toString();
	return {
		fullSource: src,
		splitSource: src.split("\n")
	}
}

// console.log(process.argv.slice(2));

// const _filestream = fs.createWriteStream("oglo.txt");

let tabNums = 0;
const writeline = (line) => {
	// _filestream.write(line + "\n");
	console.log("\t".repeat(tabNums) + line);
}
const indentUp = () => {tabNums++}
const indentDown = () => {tabNums--}
writeline("digraph G {");
let clusterNum = 0;


const parser = new Parser();
parser.setLanguage(PYTHON);


/**
 * 
 * @param {Parser.TreeCursor} walker 
 * @param {function (Parser.SyntaxNode, number): void|boolean} nodeFunctor If the functor returns any value, the walker will not walk through child nodes
 * @param {number} depth 
 */
function dfsWalk(walker, nodeFunctor, depth=0) {
	const result = nodeFunctor(walker.currentNode, depth);
	if ((typeof(result) === "undefined") && walker.gotoFirstChild()) dfsWalk(walker, nodeFunctor, depth+1);
	if (walker.gotoNextSibling()) dfsWalk(walker, nodeFunctor, depth);
	while (depth >= 1 && walker.gotoParent()) {
		depth--;
		if (walker.gotoNextSibling()) dfsWalk(walker, nodeFunctor, depth);
	}
}


for (const filepath of process.argv.slice(2)) {
	const source = openSourceFile(filepath);
	const tree = parser.parse(source.fullSource);
	const walta = tree.walk();

	indentUp();
	writeline(`subgraph cluster_${clusterNum++} {`);
	indentUp();
	writeline(`label = "${filepath}"`);
	
	let parentFunc = "ERR";
	
	/**
	 * @param {Parser.TreeCursor} walker 
	*/
	function pythonParseFunction(walker) {
		//Currently is a function_definition node
		walker.gotoFirstChild();
		while (walker.currentNode.type !== "identifier") walker.gotoNextSibling();
		const funcname = walker.currentNode.text;
		while (walker.currentNode.type !== "block") walker.gotoNextSibling();
		parentFunc = funcname;
		writeline(`"${funcname}"`);
	}
	
	dfsWalk(walta, (node, currentDepth) => {
		// console.log("--".repeat(currentDepth) + node.type + " '"+ (node.startPosition.row == node.endPosition.row ? source.splitSource.at(node.startPosition.row).slice(node.startPosition.column, node.endPosition.column) : "") + "'");
		
		if (node.type === "function_definition") {
			pythonParseFunction(walta);
		}
		if (node.type === "call") {
			writeline(`"${parentFunc}" -> "${node.text.slice(0, node.text.indexOf("(")).replace("self.", "")}" [label=calls]`)
		}
	});
	
	indentDown();
	writeline(`}`); //Close subgraph cluster
}

indentDown();
writeline("}"); //Close digraph
// _filestream.close();