
var sequencer = {
    
    //declares and initializes values
    initValues: function(){
        bar = 0;
        inbarCounter = 0;
        beatIndex = 0;
        timer = 0;
        quaters = 0;
        eights = 0;
        eighttriads = 0;
        sixteentriads = 0;
        setPoints = 0;
        beatIndex = 0;
        takt = 4;
        beats = 0;
        isRunning = false;
        
        //set speedslider two default 100 bpm
        this.sliderChange(document.getElementById("bpmSpeed").value);
    },
    
    ////////////////////////////
    //speedcalculation
    
    //multiplier for realtime
    MULTIPLY : 6.25, 
    
    //calculates realtime-bpm
    bpmCalc: function(bpm){
        return (100/bpm)* this.MULTIPLY;                
    },
    
    ///////////////////////////
    
    //changes sequencerspeed - bpm
    sliderChange: function(value){
        bpm = value;
        document.getElementById("showBpm").innerHTML = bpm;
    },
    
    
    //bar and quaters for display - NOT USED
    showValues: function(bar, quaters){
        document.getElementById("bar").innerHTML = bar +"."; 
        document.getElementById("quaters").innerHTML = quaters;
        return this;
    },
    
    //set song
    songToLoad: function(loadSong, songName){
        this.loadSong = loadSong;
        this.loadedSongName = songName;
        //song is loaded after selection
        dataProcess.loadSong(this.loadSong);
    },
    
    getNameOfLoadedSong:function(){
        return this.loadedSongName;
    },
    
    setTimeTo(newTime){
        beatIndex = newTime;
    },
    
    //checks if song has ended
    //starts timer for tonesetting 
    startSequencer: function(){
        
        //get rid of this problem in subfunction
        var self = this;
        
        //stop sequencer when song ended
        if(dataProcess.songEnded){
            this.endSequencer();
        }
        
        //the actual tonesetter handling
        if(!isRunning){
            bar++;
            
            //sets tones depending on bpm
            timer = setInterval(function(){
                beatIndex++;
                
                //this is the actual playerloop - beatindex is minimal timecounter
                dataProcess.playLoop(beatIndex);
                
                //transport sync
                document.getElementById("transportFader").value = beatIndex;
                //sequencerspeed
            }, this.bpmCalc(bpm));
        }
        isRunning = true;
    },
    
    //pauses when startbutton is toggled
    pauseSequencer: function(){
        isRunning = false;
        clearInterval(timer);
    },
    
    //ending sequencer when reset oder song ends
    endSequencer: function(){
        isRunning = false;        
        clearInterval(timer);                
        this.initValues();
        dataProcess.setTimerTo(0);
        positioning.unSetAll();
    },
    
    //starts and pauses sequencer
    polyStartStopToggle: function(){
        if(!isRunning){
            this.startSequencer();
        }
        else{
            this.pauseSequencer();
        }
    },
    
    countInBar: function(){
        inbarCounter++;
        if(inbarCounter > takt*100){

            bar++;
            inbarCounter = 0;
        }

        //metrum calculation 
        quaters = parseInt((inbarCounter/100)+1);
        eights = parseInt((inbarCounter/50)+1);
        eighttriads = parseInt((inbarCounter/33.334)+1);
        sixteentriads = parseInt((inbarCounter/16.667)+1);
        self.showValues(bar, quaters);
    }
}

