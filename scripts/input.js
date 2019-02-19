
//start stop toggle
$('#startbutton').click(function(){sequencer.polyStartStopToggle()});
                        

 //manipulate bpm
$("#bpmSpeed").on("input change", function(){sequencer.sliderChange(document.getElementById("bpmSpeed").value)});

//resetbutton
$('#endbutton').click(function(){sequencer.endSequencer();});


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
    /*var x = this.getAttribute("fretPos");
    var y = this.getAttribute("stringPos");
    Sounds.playSound(parseInt(x), parseInt(y)
    )
    $(this).css("background-color", "green");*/
});

//saves to storage
$('#savebutton').click(function(){
    localStorage.setItem('test', recordlayer.getRecorded());
})