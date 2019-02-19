
//initialize
(function(){    
    //create guitar
    var guitar = new guitarBuilder(27,50,60);
    //initialize sequencer
    sequencer.initValues();
    recordlayer.recordInit();
    
    //create record field and hide for defaultmode
    recordlayer.recordFields();
    $('.recordPoint').hide();
    
})();


