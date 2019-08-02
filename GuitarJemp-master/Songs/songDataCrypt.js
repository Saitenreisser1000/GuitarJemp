//testcrypt
songData = function(song){
    
    this.time = [];
    this.yPos = [];
    this.xPos = [];
    this.song = song;
    var song = song.split(',');
    //iterate over songdata decrypt and set as array
    for(var i = 0; i < song.length; i++){
        var songDecr = song[i];
        songDecr = songDecr.split('|');
        this.setTime(parseInt(songDecr[0]));   
        this.setXPos(parseInt(songDecr[1]));
        this.setYPos(parseInt(songDecr[2]));
    }
}

//set songdata when record 
songData.prototype.setTime = function(time){
    this.time.push(time);
}

songData.prototype.setYPos = function(yPos){
    this.yPos.push(yPos);
}

songData.prototype.setXPos = function(xPos){
    this.xPos.push(xPos);
}

//get songdata for playing certain song
songData.prototype.getTime = function(){
    return this.time;
}

songData.prototype.getYPos = function(){
    return this.yPos; 
}

songData.prototype.getXPos = function(){
    return this.xPos;
}



