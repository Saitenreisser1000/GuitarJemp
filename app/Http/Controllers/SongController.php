<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request; 
use App\Song;

class SongController extends Controller
{
    public function index()
    {    
        return Song::all();
    }

    public function store(Request $request)
    {
        $this->validate($request, [
            'name' => 'required',
            'songdata'  => 'required'
        ]);

        $song = new Song;
        $song->songdata = $request->input('songdata');
        $song->name = $request->input('name');
        $song->user_id = auth()->user()->id;
        $song->save();
    }

    
    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
       //$song = Song::findOrFail($id);
       //$songdata = Song::find($id)->songdata;
       //return redirect('/home')->with('songdata');
       //return view('song', compact('songdata'));
    }

    /**
     * Remove the specified resource from storage.
     * 
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //dd($id);
        $song = Song::findOrFail($id);
        /*if($song->delete()){
            return new Song($song);
        }*/
        return response(null, Response::HTTP_OK);
    }
}
