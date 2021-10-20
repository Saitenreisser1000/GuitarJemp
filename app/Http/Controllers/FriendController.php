<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\User;

class FriendController extends Controller
{
    public function index()
    {
        $aut = auth()->user()->id;

        $friends = User::find($aut)->friendship()->get();
        $friendlist = [];
        foreach($friends as $friend){
            array_push($friendlist, User::find($friend->friend_id));    
        } 
        return view('social', compact('friendlist'));
    }
}
