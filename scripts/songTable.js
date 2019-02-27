var table = new Tabulator("#songTable", {
    height:"311px",
    layout:"fitColumns",
    ajaxURL:"http://localhost/guitarJempPHP/gJSaveLoadSong.php",
    //ajaxProgressiveLoad:"scroll",
    //selectable:true,
    paginationSize:20,
    placeholder:"No Data Set",
    columns:[
        {title:"Name", field:"songName", sorter:"string", width:200,},
        {title:"Type", field:"songType", sorter:"number", formatter:"progress"},
        {title:"Level", field:"level", sorter:"string"},
        {title:"Creation-date", field:"creationdate", sorter:"date", align:"center"},
        {title:"Creator", field:"creator", align:"center", sorter:"string"},
        
    ],
    
    //sends song to sequencer
    rowClick:function(e, row){
        var loadedSongData = row.getData().songData;
        sequencer.endSequencer();
        sequencer.songToLoad(new songData(loadedSongData));
        
        //sets transport maximum to maximumlenth from song
        document.getElementById("transportFader").max =  dataProcess.songEnd();
        //transport-fader to 0
        document.getElementById("transportFader").value = 0;
        //console.log(dataProcess.songEnd());
    },   
    
});

