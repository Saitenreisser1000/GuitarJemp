<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Song;
use App\User;

class HomeController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Show the application dashboard.
     *
     * @return \Illuminate\Contracts\Support\Renderable
     */
    public function index()
    {
        $aut = auth()->user()->id;

        $songs = User::find($aut)->songs()->get();
        $friends = User::find($aut)->friendship()->get();
        $friendlist = [];
        foreach($friends as $friend){
            array_push($friendlist, User::find($friend->friend_id));    
        } 
        return view('home', compact('songs', 'friendlist'));
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
        $song->description = $request->input('description');
        $song->user_id = auth()->user()->id;
        $song->save();
        return redirect('home')->with('success', 'Song Created');
    }
}
