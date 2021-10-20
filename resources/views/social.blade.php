@extends('layouts.app')

@section('content')
<div class="container">
    <div class="row justify-content-center">
        <div class="col-md-8">
            <div class="card">
                <div class="card-header">{{ Auth::user()->name }}{{ __('\'s socialClub') }}
                    <form class="form-inline my-2 my-lg-0 float-right">
                        <input class="form-control mr-sm-2" type="search" placeholder="Search for friend" aria-label="Search">
                        <button class="btn btn-outline-secondary my-2 my-sm-0" type="submit">Search</button>
                    </form>
                </div>
                <div class="card-body">
                    @foreach ($friendlist as $friend)
                    <a href="" class="card shadow-sm mb-1">
                    <h5 class="m-2">{{ $friend->name }}</h5>
                    </a>
                    @endforeach
                </div>
            </div>
        </div>
    </div>
</div>

@endsection