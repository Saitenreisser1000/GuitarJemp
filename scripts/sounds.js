
const Sounds = {
   
    getSound: function (posX, posY){

        var soundNr = 0;
        if(posY == 0){
            soundNr = posX+1;
        }
        if(posY == 1){
            soundNr = posX+6;
        }
        if(posY == 2){
            soundNr = posX+11;
        }
        if(posY == 3){
            soundNr = posX+16;
        }
        if(posY == 4){
            soundNr = posX+20;
        }
        if(posY == 5){
            soundNr = posX+25;
        }

        return soundNr;                              
    },

    playSound: function(posX, posY, duration){
        duration = this.calculateDuration(duration);
        let audio = new Audio();
        this.audio = audio;
        this.audio.src = "audio/AcousticGuitar"+this.getSound(posX,posY)+".mp3";
        this.audio.play();
        setTimeout(function(){audio.pause()}, duration);
    },
    
    calculateDuration: function(note){
        
        //TODO note calculation
        
        if(note === undefined){
            return 400;
        }else{
            return note;
        }
    }
}