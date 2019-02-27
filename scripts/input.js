/*************************
    basic start stop
*************************/

//start stop toggle
$('#startbutton').click(function(){sequencer.polyStartStopToggle()});
                        

 //manipulate bpm
$("#bpmSpeed").on("input change", function(){sequencer.sliderChange(document.getElementById("bpmSpeed").value)});

//resetbutton
$('#endbutton').click(function(){sequencer.endSequencer();                    
document.getElementById("transportFader").value = 0;});



/*******************
    transporter
*******************/

//draggable transporter
//change
$("#transportFader").mousedown(function(){
    sequencer.polyStartStopToggle();
});
//mouse release
$("#transportFader").mouseup(function(){
    sequencer.setTimeTo(this.value);
    sequencer.polyStartStopToggle();
});


/************************
        recordlayer
************************/
$('#recordbutton').click(function(){
    console.log(localStorage.getItem('test'));
    $(".recordPoint").toggle("fast");
    $("#inputbox").toggle("fast");
});

//which point is pressed
$('.recordPoint').click(function(){
    recordlayer.clickRecorder(this);
    $(this).css("background-color", "green");
});

//test send to php
$('#loadbutton').click(function(){
   new loadSong();

});

//song is saved
$(document).ready(function() {
    $('#savebutton').click(function() {
        $('#overlay').fadeIn(300);  
    });
    $('#close').click(function() {
    
        //song saved by name
        saveSong($('#songName').val(),recordlayer.getRecorded() );
        $('#overlay').fadeOut(300);
    });
     $('#cancel').click(function() {
        $('#overlay').fadeOut(300);
    });
});