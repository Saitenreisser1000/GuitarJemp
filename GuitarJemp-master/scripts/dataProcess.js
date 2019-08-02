
var dataProcess = {

    endOffset: 200,
    counter: 0,
    songEnded: false,

    setTimerTo: function(setTo){
        this.counter = setTo;
    },

    /**************************
        tonesetter function
    **************************/
    playLoop: function(beat){
        this.songEnded = false;
        if(beat == this.time[this.counter]){

            //actual tonesetter!!!
            positioning.set(this.counter, this.setXPos[this.counter], this.setYPos[this.counter]);

            this.counter++;
        }
        if(beat == this.songEnd()){
            this.songEnded= true;
            sequencer.pauseSequencer();         
        }
    },
    /***************************
        tonesetter loopend!!
    ****************************/
    
    loadSong: function(songToLoad){

        this.time = songToLoad.getTime();
        this.setXPos = songToLoad.getXPos();
        this.setYPos = songToLoad.getYPos();
    },

    //calculates song end including offset
    songEnd: function(){
        return this.time[this.time.length-1]+this.endOffset;
    }

}
    