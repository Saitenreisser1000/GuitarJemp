<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('auth:api')->get('/user', function (Request $request) {
    return $request->user();
});

Route::get('songs', 'SongController@index');

Route::get('songs/{id}', 'SongController@show');

Route::post('song', 'SongController@store');

Route::put('song', 'SongController@store');

Route::delete('song/{id}', 'SongController@destroy');