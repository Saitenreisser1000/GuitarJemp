
const _sampler = new Tone.Sampler({
        "E1" : "AcousticGuitarE1.mp3",
        "F1" : "AcousticGuitarF1.mp3",
        "F#1" : "AcousticGuitarFshrp1.mp3",
        "G1" : "AcousticGuitarG1.mp3",
        "G#1" : "AcousticGuitarGshrp1.mp3",
        "A1" : "AcousticGuitarA1.mp3",
        "Bb1" : "AcousticGuitarBb1.mp3",
        "B1" : "AcousticGuitarB1.mp3",
        "C2" : "AcousticGuitarC2.mp3",
        "C#2" : "AcousticGuitarCshrp2.mp3",
        "D2" : "AcousticGuitarD2.mp3",
        "D#2" : "AcousticGuitarDshrp2.mp3",
        "E2" : "AcousticGuitarE2.mp3",
        "F2" : "AcousticGuitarF2.mp3",
        "F#2" : "AcousticGuitarFshrp2.mp3",
        "G2" : "AcousticGuitarG2.mp3",
        "G#2" : "AcousticGuitarGshrp2.mp3",
        "A2" : "AcousticGuitarA2.mp3",
        "Bb2" : "AcousticGuitarBb2.mp3",
        "B2" : "AcousticGuitarB2.mp3",
        "C3" : "AcousticGuitarC3.mp3",
        "C#3" : "AcousticGuitarCshrp3.mp3",
        "D3" : "AcousticGuitarD3.mp3",
        "D#3" : "AcousticGuitarDshrp3.mp3",
        "E3" : "AcousticGuitarE3.mp3",
        "F3" : "AcousticGuitarF3.mp3",
        "F#3" : "AcousticGuitarFshrp3.mp3",
        "G3" : "AcousticGuitarG3.mp3",
        "G#3" : "AcousticGuitarGshrp3.mp3",
        "A3" : "AcousticGuitarA3.mp3",
        "Bb3" : "AcousticGuitarBb3.mp3",
        "B3" : "AcousticGuitarB3.mp3",
        "C4" : "AcousticGuitarC4.mp3",
        "C#4" : "AcousticGuitarCshrp4.mp3",
        "D4" : "AcousticGuitarD4.mp3",
        "D#4" : "AcousticGuitarDshrp4.mp3",
        "E4" : "AcousticGuitarE4.mp3",
        "F4" : "AcousticGuitarF4.mp3",
        "F#4" : "AcousticGuitarFshrp4.mp3",
        "G4" : "AcousticGuitarG4.mp3",
        "G#4" : "AcousticGuitarGshrp4.mp3",
        "A4" : "AcousticGuitarA4.mp3",
        "Bb4" : "AcousticGuitarBb4.mp3",
        "B4" : "AcousticGuitarB4.mp3",
        "C5" : "AcousticGuitarC5.mp3",
        "C#5" : "AcousticGuitarCshrp5.mp3",
        "D5" : "AcousticGuitarD5.mp3"
    }, {
        "release" : 1,
        "baseUrl" : "./audio/"
    }).toMaster()

console.log(_sampler)
var _tonearray = []
var _counter = 0

//addTone('E1', "0:1")
//addTone('E1', "0:1", 4)
function addTone(tone, time, velocity = 1, posX, posY){
    _tonearray.push(new function(){
        this.tone = tone
        this.time = time
        this.velocity = velocity
        this.posX = posX
        this.posY = posY
    })
}

function _triggerTone(time){

    for(tone of _tonearray){
        _sampler.triggerAttack(tone.tone, tone.time, tone.velocity);

        positioning.set(_counter, tone.posX, tone.posY);
        _counter++
    }
}

function playTone(tone, time, velocity = 1){
        Tone.Transport.schedule(_triggerTone, time)
}

function getToneForPosition(posX, posY){
    
    return 
}

document.querySelector("#test").addEventListener("click", e => {
    addTone('G1', "0:1")
    addTone('G#1', "0:2")
    addTone('A2', "0:3")
    addTone('Bb3', "0:4")
    playTone()
    Tone.Transport.start()
})








