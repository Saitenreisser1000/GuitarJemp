
@extends('layouts.app')

@section('content')

<div class="container">
    <!--div class="row justify-content-center">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">{{ Auth::user()->name }}{{ __('\'s Dashboard') }}</div>
                
                <div class="card-body">
                    @if (session('status'))
                        <div class="alert alert-success" role="alert">
                            {{ session('status') }}
                        </div>
                    @endif

                    @foreach ($songs as $song)
                    <a href="{{ route('song', $song->id) }}" class="card shadow-sm mb-1">               
                        <h5 class="card-title m-2 float-left">{{$song->name}}</h5>
                        <h6 class="card-subtitle m-2 text-muted">{{$song->description}}</h6>                               
                    </a>
                    @endforeach
                    <br>

                    
                    <div class="card">
                        <p class="card-header">friends</p>
                        <hr>
                        @foreach ($friendlist as $friend)
                        <a href="" class="shadow-sm mb-1">
                            <h5 class="m-2">{{ $friend->name }}</h5>
                        </a>
                        @endforeach
                    </div>
                    
                </div>
                <hr>
                <a href="{{ url('./add') }}" class="btn btn-primary">add new</a>
            </div>
        </div>
    </div-->
</div>
@endsection
