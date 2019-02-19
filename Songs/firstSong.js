//testsongs
class testOne{

    getTime(){
        return [1,50,100,150,200,250,300,350,400,450,500,550,600];           
    }

    getYPos(){
        return [1,2,3,4,5,5,5,5,4,3,3,1,0]; 
    }

    getXPos(){
        return [8,7,5,6,5,8,13,12,13,14,10,12,13];
    }

}

class testTwo{
    
    getTime(){
        return [1,50,100,150,200,250,300,350,400,450,500,550,600];
    }
    
    getYPos(){
        return [5,5,5,5,5,5,5,5,5,3,3,1,0]; 
    }

    getXPos(){
        return [8,9,10,11,12,13,14,15,13,14,10,12,13];
    }
    
}

songData = function(song){
    
    this.time = [];
    this.yPos = [];
    this.xPos = [];
    this.song = song;

    //iterate over songdata decrypt and set as array
    for(var i = 0; i < song.length; i++){
        var songDecr = this.decryptSongData(song[i]);
        this.setTime(parseInt(songDecr[0]));
        this.setXPos(parseInt(songDecr[1]));
        this.setYPos(parseInt(songDecr[2]));
    }  
}

songData.prototype.decryptSongData = function(songString){
    return songString.split("|");    
}

//setter for songdata
songData.prototype.setTime = function(time){
    this.time.push(time);
}

songData.prototype.setYPos = function(yPos){
    this.yPos.push(yPos);
}

songData.prototype.setXPos = function(xPos){
    this.xPos.push(xPos);
}

//getter for songdata
songData.prototype.getTime = function(){
    return this.time;
}

songData.prototype.getYPos = function(){
    return this.yPos; 
}

songData.prototype.getXPos = function(){
    return this.xPos;
}



