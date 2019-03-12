#import (
#'express' as webapp
#'twitter'
#)

class Message
    func constructor(@name, @content)
        csl.log(`${name} - ${content}`)

    func getMessage()
        return [@name, @content]

func randomString(number)
    _alphabet: "1234567890azertyuiopqsdfghjklmwxcvbnAZERTYUIOPQSDFGHJKLMWXCVBN"
    $random: ""

    for $i: 0, i < number, i++
        random: random + alphabet[Math.floor(Math.random() * Math.floor(alphabet.length))]

    return random

_json:: {
    key: "valeur"
}!:

_randomNumber: Math.random()

if randomNumber < 0.5
    csl.log(randomString(15))
elsif randomNumber < 0.7
    csl.log(json.key)
else
    csl.log(":)")

_test = 5

switch(test)
    case 1
        csl.log("just")
        break
    case 2
        csl.log("do")
        break
    default
        csl.log("it")
        break