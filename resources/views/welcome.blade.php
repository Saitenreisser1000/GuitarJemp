@extends('layouts.app')

@section('content')
    <!--div class="container">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card">
                    <div class="card-header">{{__("public board")}}</div>
                        <p>this is from backend</p>
                    @foreach($allSongs as $song)
                    <a href="{{ route('song', $song->id) }}" class="card shadow-sm mb-1">
                        <h5 class="card-title m-2">{{$song->name}}</h5>
                        <h6 class="card-subtitle m-2 text-muted">{{$song->description}}</h6>
                    </a>
                    @endforeach
                </div>
            </div>
        </div>
    </div-->
@endsection