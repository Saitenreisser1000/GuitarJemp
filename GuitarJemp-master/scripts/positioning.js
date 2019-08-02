      
var positioning = {

    points : [],

    //calculates absolute x position
    getXPosition: function(xPos){
        var xNull = 60;
        var xOffset = 50;
        return xNull+(xPos*xOffset);
    },
    
    //calculates absolute stringposition
    getStringPosition: function(yPos){
        var yNull = 214;
        var yOffset = 27;
        return yNull-(yPos*yOffset);
    },
    
    //in this function the point is set 
    set: function(setpointsNr, posX, posY){
        this.points.push(pointNr = new SetPoint(posX, posY));   

    },
    
    //unsets all points when reseting
    unSetAll: function(){
        for(var i = 0; i < this.points.length; i++){
            document.getElementById("point").parentNode.removeChild(document.getElementById("point"));
        }
        
        //clears array
        this.points = [];         
    }

}
    
