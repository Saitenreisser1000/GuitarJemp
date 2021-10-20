<?php

use Illuminate\Support\Facades\Route;
use App\Song;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/
 

Route::get('/', function () {
    $allSongs = Song::all(); 
    return view('welcome', compact('allSongs'));
});

Auth::routes();

Route::get('/home', 'HomeController@index')->name('home');

Route::get('/song/{id}', 'SongController@show')->name('song');

Route::get('/social', 'FriendController@index')->name('social');

Route::post('/addsongs', 'HomeController@store');

Route::get('/add', function () {
    return view('add');
});
