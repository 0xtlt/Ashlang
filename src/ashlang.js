#!/usr/bin/env node

const fs = require("fs");
const args = require('./args');
const vm = require('vm');

const argsData = args(process.argv);
//console.log(argsData); //Debug only

parse(argsData.fileToExecute, function(js){
    if(argsData.execute){
        let sandbox = {
            console
        };
        vm.createContext(sandbox);
        vm.runInContext(js, sandbox);
    
        return sandbox;
    } else if(argsData.destinationFile){
        writeJs(argsData.destinationFile, js);
    }
});

const reg = {
    // Regex name
    // |     Regex
    // |     |
    // v     v
    import: /import \(((\n|\r|'|"|[a-zA-Z]| |\d|\.)+)\)(.*)/gms,
    subImport: /(("|')+)(([a-zA-Z]| |\d|_|"|'|`)+)(("|')+)(( |)+)(([a-zA-Z]| |)+)/gms,
    func: /^func (([a-zA-Z]| |\d|_)+)\(((|[a-zA-Z]|@| |\d|,)+)\)/gms,
    staticFunc: /^func# (([a-zA-Z]| |\d|_)+)\(((|[a-zA-Z]|@| |\d|,)+)\)/gms,
    letvar: /^\$(([^:]*)+):(.*)/gm,
    thisvar: /^@(([^:]*)+):(.*)/gm,
    constvar: /^_(([^:]*)+):(.*)/gm,
    letAll: /^(([a-zA-Z]|\d|_)+)(.):(.*)/gm,
    letPlus: /^(([a-zA-Z]|\d|_)+)\+\+/gm,
    letMinus: /^(([a-zA-Z]|\d|_)+)--/gm,
    letChange: /^(([a-zA-Z]|\d|_|\[|\]|"|')+):(.*)/gm,
    longLetvar: /^\$(([a-zA-Z]|\d|_)+)::(.*)/gm,
    longLetconst: /^_(([a-zA-Z]|\d|_)+)::(.*)/gm,
    for: /^for (([^,]*)+),(([^,]*)+),(.*)/gm,
    return: /^return (.*)/gm,
    funcParamSet: /@(([a-zA-Z]|\d|_)+)/gms,
    var: /var (([a-zA-Z]| |\d|_)+)=(([a-zA-Z]| |\d|_|"|'|`)+);/mgs,
    console: /^csl\.(.*)/gm,
    if: /^if (.*)/gm,
    class: /^class (([a-zA-Z]|\d|_)+)/gm,
    catch: /^catch\((.*)/gm,
    switch: /^switch\((.*)/gm,
    case: /^case(.*)/gm,
    thisdetect: /@(([a-zA-Z]|\d|_|.)+)/gms,
};

function test(regex, string){
    regex.lastIndex = 0;
    return regex.test(string);
}

function execute(regex, string){
    regex.lastIndex = 0;
    return regex.exec(string);
}


//lastC = last character at the end of each sentence if you want to have a nice code
const lastC = "\n";

/**
 * @param {string} file 
 * @param {string} out 
 */
function parse(file, callback){
    fs.readFile(file, "utf-8", function(err, buf){
        let ashProg = buf.toString();
        let javascriptProg = "";

        let nextProg = ""; // contains the program after imports in the variable ashProg

        //Import management
        if(test(reg.import, ashProg)){
            let inImport = execute(reg.import, ashProg);

            nextProg = inImport[3];

            //
            while ((x = reg.subImport.exec(inImport[1])) !== null){
                let req = "const ";

                //To avoid infinite loops
                if (x.index === reg.subImport.lastIndex) {
                    reg.subImport.lastIndex++;
                }

                if(x[9] === ""){
                    req += x[3];
                } else {
                    req += x[9].substr(3, x[9].length);
                }

                req += ` = require('${x[3]}');`+lastC;

                javascriptProg += req;
            }
        } else {
            nextProg = ashProg;
        }
        //Import END

        //We will analyze the program line by line
        const lines = nextProg.replace(/\r/g, "").split("\n");

        //lastT (last Tabs) will count the number of tabs made each time
        let lastT = [];

        //to support variables on multiple lines
        let longVar = false;

        //to ignore the processing of the line by regex
        let ignoreDown = false;

        //to detect if a line is in a class
        let inClass = null;

        let useLastC = true;


        lines.forEach((line, index) => {
            //scLine = scaled down line
            let scLine = line.trim();

            //         Ignore empty line
            //         |                    Ignore line which begin by #
            //         |                    |
            //         v                    v
            if(scLine !== "" && scLine[0] !== "#"){
                //To delimit code blocks
                let numberOfTab = line.split("    ").length - 1;

                if(lastT.length !== 0){
                    let tmplastT = Object.assign([], lastT);
                    let alreadyElse = false;
                    tmplastT.reverse().map(x => {
                        if(x >= numberOfTab){
                            //else block
                            if(lines[index].trim() === "else" && !alreadyElse && x === numberOfTab){
                                javascriptProg += tab("    ", x)+"} else {"+lastC;
                                ignoreDown = true;
                                alreadyElse = true;
                            } /** elseif block */ else if(lines[index].trim().substr(0, 5) === "elsif" && !alreadyElse && x === numberOfTab){
                                let tmp = execute(reg.if, scLine.substr(3));

                                javascriptProg += `} else if(${tmp[1]}){`+lastC;
                                ignoreDown = true;
                                alreadyElse = true;
                            } /** end block */ else {
                                if(x === inClass){
                                    inClass = null;
                                }
                                javascriptProg += tab("    ", x)+"}"+lastC;
                                lastT.pop();
                            }
                        }
                    });
                }

                //add tab
                if(!ignoreDown) javascriptProg += lastC !== null ? tab("    ", numberOfTab) : ""; else ignoreDown = false;

                //Parse lines
                //if longvar is not closed

                if(longVar){
                    if(scLine.substr(scLine.length - 2) === "!:"){
                        longVar = false;
                        javascriptProg += scLine.substr(0, scLine.length - 2)+";";
                    } else {
                        javascriptProg += scLine;
                    }
                } else if(test(reg.class, scLine)){ // class
                    let tmp = execute(reg.class, scLine);

                    //indicates that a block of code is open
                    lastT.push(numberOfTab);

                    inClass = numberOfTab;
                    javascriptProg += `class ${tmp[1]} {`;
                } else if(test(reg.func, scLine)){ // func -> function
                    let tmp = execute(reg.func, scLine);

                    //indicates that a block of code is open
                    lastT.push(numberOfTab);

                    if(inClass === null){
                        javascriptProg += `function ${tmp[1]}(${tmp[3]}){`;
                    } else {
                        javascriptProg += `${tmp[1]}(${tmp[3].replace(/@/g, "")}){`+lastC;;
                        let tmp_;

                        while((tmp_ = reg.funcParamSet.exec(tmp[3])) !== null){
                            javascriptProg += tab("    ", numberOfTab+1)+`this.${tmp_[1]} = ${tmp_[1]};`+lastC;
                        }

                        reg.funcParamSet.lastIndex = 0;
                    }
                } else if(test(reg.staticFunc, scLine)){ // func# -> static function
                    let tmp = execute(reg.staticFunc, scLine);

                    //indicates that a block of code is open
                    lastT.push(numberOfTab);

                    if(inClass === null){
                        javascriptProg += `function ${tmp[1]}(${tmp[3]}){`;
                    } else {
                        javascriptProg += `static ${tmp[1]}(${tmp[3].replace(/@/g, "")}){`+lastC;;
                        let tmp_;

                        while((tmp_ = reg.funcParamSet.exec(tmp[3])) !== null){
                            javascriptProg += tab("    ", numberOfTab+1)+`this.${tmp_[1]} = ${tmp_[1]};`+lastC;
                        }

                        reg.funcParamSet.lastIndex = 0;
                    }
                } else if(scLine === "break"){ // break
                    javascriptProg += `break;`;
                } else if(scLine === "default"){ // default
                    javascriptProg += `default:`;
                } else if(test(reg.case, scLine)){ // case
                    let tmp = execute(reg.case, scLine);
                    javascriptProg += `case ${tmp[1]}:`;
                } else if(scLine === "try"){ // try
                    lastT.push(numberOfTab);
                    javascriptProg += `try {`;
                } else if(test(reg.catch, scLine)){ // catch
                    let tmp = execute(reg.catch, scLine);

                    lastT.push(numberOfTab);
                    javascriptProg += `catch(${tmp[1].substr(0, tmp[1].length - 1)}){`;
                } else if(test(reg.switch, scLine)){ // switch
                    let tmp = execute(reg.switch, scLine);

                    lastT.push(numberOfTab);
                    javascriptProg += `switch(${tmp[1].substr(0, tmp[1].length - 1)}){`;
                } else if(test(reg.if, scLine)){ // if
                    let tmp = execute(reg.if, scLine);

                    lastT.push(numberOfTab);
                    javascriptProg += `if(${tmp[1]}){`;
                } else if(test(reg.for, scLine)){ // for
                    let tmp = execute(reg.for, scLine);

                    lastT.push(numberOfTab);
                    javascriptProg += `for(${parseVar(tmp[1])}${tmp[3]};${tmp[5]}){`;
                } else if(test(reg.longLetvar, scLine)){ // long let
                    let tmp = execute(reg.longLetvar, scLine);

                    longVar = true;
                    javascriptProg += `let ${tmp[1]} =${this_(tmp[3])}`;
                } else if(test(reg.longLetconst, scLine)){ // long const
                    let tmp = execute(reg.longLetconst, scLine);

                    longVar = true;
                    javascriptProg += `const ${tmp[1]} =${this_(tmp[3])}`;
                } else if(test(reg.letvar, scLine) || test(reg.letChange, scLine) || test(reg.letAll, scLine) || test(reg.letPlus, scLine) || test(reg.letMinus, scLine) || test(reg.constvar, scLine)){ // var
                    javascriptProg += parseVar(scLine);
                } else if(test(reg.console, scLine)){ // console
                    let tmp = execute(reg.console, scLine);

                    javascriptProg += `console.${parseThis(tmp[1])};`;
                } else if(test(reg.return, scLine)){ // return
                    let tmp = execute(reg.return, scLine);

                    javascriptProg += `return ${parseThis(tmp[1])};`;
                } else if(test(reg.thisdetect, scLine)){
                    let tmp = execute(reg.thisdetect, scLine);

                    javascriptProg += `this.${tmp[1]};`;
                } else {
                    //javascriptProg += scLine;
                    useLastC = false;
                }
            } else {
                useLastC = false;
            }

            javascriptProg += useLastC ? lastC : "";
            useLastC = true;
        });

        lastT.reverse();
        for(let n = 0; n <= lastT.length-1; n++){
            javascriptProg += tab("    ", lastT[n])+"}"+lastC;
        }

        callback(javascriptProg);
    });
}

function this_(string){
    return string.replace(reg.thisdetect, "this.$1");
}

function writeJs(out, javascriptProg){
    fs.writeFile(out, javascriptProg, function(err, data) {
        if (err) console.log(err);
        console.log("Successfully Written.");
    });
}

/**
 * @param {string} c
 * @param {number} n 
 * @returns {string}
 */
function tab(c, n){
    let p = "";
    [...Array(n).keys()].forEach(x => {
        p += c;
    })

    return p;
}

/**
 * @param {string} string 
 */
function parseThis(string){
    return string.replace(reg.funcParamSet, "this.$1")
}

/**
 * @param {string} line 
 */
function parseVar(line){
    if(test(reg.letvar, line)){ //$ -> let
        let tmp = execute(reg.letvar, line);

        return `let ${tmp[1]} =${this_(tmp[3])};`;
    } else if(test(reg.constvar, line)){ //_ -> const
        let tmp = execute(reg.constvar, line);

        return `const ${tmp[1]} =${this_(tmp[3])};`;
    } else if(test(reg.letChange, line)){ //let:
        let tmp = execute(reg.letChange, line);

        return `${tmp[1]} =${this_(tmp[3])};`;
    } else if(test(reg.letAll, line)){ //let all
        let tmp = execute(reg.letAll, line);

        return `${tmp[1]} ${tmp[3]}=${tmp[4]};`;
    } else if(test(reg.letPlus, line)){ //let++
        let tmp = execute(reg.letPlus, line);

        return `${tmp[1]}++;`;
    } else if(test(reg.letMinus, line)){ //let--
        let tmp = execute(reg.letMinus, line);

        return `${tmp[1]}--;`;
    } else {
        return "";
    }
}