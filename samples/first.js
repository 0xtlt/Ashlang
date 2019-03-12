class Message {
    constructor(name, content){
        this.name = name;
        this.content = content;

        console.log(`${name} - ${content}`);
    }
    getMessage(){

        return [this.name, this.content];
    }
}
function randomString(number){
    const alphabet = "1234567890azertyuiopqsdfghjklmwxcvbnAZERTYUIOPQSDFGHJKLMWXCVBN";
    let random = "";
    for(let i = 0; i < number; i++){
        random = random + alphabet[Math.floor(Math.random() * Math.floor(alphabet.length))];
    }
    return random;
}
const json = {
    key: "valeur"
};
const randomNumber = Math.random();
if(randomNumber < 0.5){
    console.log(randomString(15));
} else if(randomNumber < 0.7){
    console.log(json.key);
} else {
    console.log(":)");
}
