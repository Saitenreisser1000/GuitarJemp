
const guitarBuilder = function(stringDistance, barDistance, fretPos){

    
    //initialize guitar
    this.boardOrientation();
    this.stringPosition(stringDistance);  
    this.barPosition(barDistance);
    this.setFretNumbers(barDistance, fretPos);
    this.setStringnames(60,27,-8);
    
}

//create strings
guitarBuilder.prototype.stringPosition = function(stringDistance){
    for(var i = 1; i <= 6; i++){
        var distance = i*stringDistance;
        var gS = document.createElement('div');
        gS.setAttribute("class", "gitString");
        gS.setAttribute("style", "top:"+i*stringDistance+"px");
        document.getElementById("guitar").appendChild(gS);
    }
}

//create bars
guitarBuilder.prototype.barPosition = function(barDistance){
    for(var i = 1; i <= 16; i++){
        var distance = i*50;
        var bP = document.createElement('div');                    
        bP.setAttribute("class", "bar");
        bP.setAttribute("style", "left:"+i*barDistance+"px");
        document.getElementById("guitar").appendChild(bP);
    }
}

//create fretnumbers
guitarBuilder.prototype.setFretNumbers = function(barDistance, fretPos){
    for(var i = 1; i <= 16; i++){
        var distance = i*barDistance+fretPos;
        var fN = document.createElement('div');
        fN.setAttribute("class", "fretNumbs");
        fN.setAttribute("style", "left:"+distance+"px");
        document.getElementById("fretNumbers").appendChild(fN);
        fN.innerHTML = i;
    }
}

//create stringnames
guitarBuilder.prototype.setStringnames = function(xPosition, stringDistance, startY){
    for(var i = 1; i <= 6; i++){
        var fN = document.createElement('div');
        fN.setAttribute("class", "stringlabel");
        fN.setAttribute("style", "left:"+xPosition+"px");
        
        var yPos = startY+(stringDistance*i);
        fN.setAttribute("style", "top:"+yPos+"px");
        document.getElementById("guitar").appendChild(fN);
        fN.innerHTML = i;
    }
}

//create board orientationfields 
//on fret 3,5,7,9,12,15
guitarBuilder.prototype.boardOrientation = function(){
    
    for(var i = 0; i < 6; i++){
        var orientPos = 103 + i*100;
        
        //position bar 12
        if(i === 4){
            orientPos = 553;
        }
        
        //position bar 15
        if(i === 5){
            orientPos = 703;
        }
        var orients = document.createElement('div');
        orients.setAttribute("class", "fretOrientPos");
        orients.setAttribute("style", "left:"+orientPos+"px");
        document.getElementById("guitar").appendChild(orients);
    }
}


