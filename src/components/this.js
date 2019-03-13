module.exports = function(line){
    if(!isNaN(line)){
        return Number(line);
    }

    let stopC = null;
    let string = "";

    for(let n = 0; n <= line.length - 1; n++){
        if(stopC === null){
            if(line[n] === "@"){
                string += "this.";
            } else if(line[n] === "'" || line[n] === '"' || line[n] === "`"){
                stopC = line[n];
                string += line[n];
            } else {
                string += line[n];
            }
        } else if(stopC === line[n]) {
            string += line[n];
            stopC = null;
        } else {
            string += line[n];
        }
    }

    return string;
}