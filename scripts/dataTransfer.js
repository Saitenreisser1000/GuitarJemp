saveSong = function(songName, songDatas){

    $.ajax({
        type: 'POST',
        url: 'http://localhost/guitarJempPHP/gJSaveLoadSong.php',
        data: {songName: songName, songData: songDatas},
        success: function(data){
            //console.log(data);
            
            //TODO
            //update div
    }
})
}
                      
loadSong = function(){

        var ajax = new XMLHttpRequest();
        var url = 'http://localhost/guitarJempPHP/gJSaveLoadSong.php';
        
        ajax.open("POST", url, true);
        ajax.send();
        
        ajax.onreadystatechange = function(){
            
            if(this.readyState == 4 && this.status == 200){
                var data = JSON.parse(this.responseText);
                
            }
        }
        return data;
}