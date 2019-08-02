
/**
SetPoint class
sets point depending on posX and posY value
*/

var SetPoint = function(posX, posY, note){
    
    this.createPoint(posX, posY, note);
    
}

SetPoint.prototype.createPoint = function(posX, posY, note){

    //point assignment
    let point = document.createElement('div');
    this.point = point;
    point.setAttribute("id","point");
    document.getElementById("pointcontainer").appendChild(point);

    //point position
    point.style.left = positioning.getXPosition(posX) +"px";
    point.style.top = positioning.getStringPosition(posY)+"px";

    //point effects
    //Sounds.playSound(posX, posY, note);
    this.makeTransparent(point, 0.6, 300);
    this.sizeChange(point);
}

/*********
 effects
*********/
SetPoint.prototype.makeTransparent = function(point, opacityVal, removeTime){
    setTimeout(function(){point.style.opacity = opacityVal},removeTime);
}

SetPoint.prototype.sizeChange = function(point){
    let sizeto = 16;
    let xyoffsetWhenChanged = 300;
    let offset = 200;
    setTimeout(function(){
        point.style.height = sizeto+"px", 
        point.style.width = sizeto+"px"      
    },offset);   
}    

