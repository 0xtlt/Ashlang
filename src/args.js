module.exports = function(args){
    let fileToExecute;
    let destinationFile;
    let execute = true;
    let nextIsDestinationFilePath = false;

    for(let i = 0;i <= args.length - 1; i++){
        if(nextIsDestinationFilePath){
            nextIsDestinationFilePath = false;
            destinationFile = args[i];
        } else {
            if(args[i].substr(args[i].length-4) === ".ash"){
                fileToExecute = args[i];
            }
    
            if(fileToExecute){
                if(args[i].substr(0,9) === "--compile"){
                    execute = false;
                    nextIsDestinationFilePath = true;
                } else if(args[i].substr(0,2) === "-c"){
                    execute = false;
                    destinationFile = fileToExecute.substr(0, fileToExecute.length-4) + ".js";
                }
            }
        }
    }

    if(nextIsDestinationFilePath){
        throw new Error("You must choose an output file (--compile <file>)");
    }

    return {
        fileToExecute,
        execute,
        destinationFile
    }
}