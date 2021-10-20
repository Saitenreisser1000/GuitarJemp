@extends('layouts.app')

@section('content')
<div class="container">
    <div class="card"> {{__('hello i m add!! from user: ') }} {{ Auth::user()->name }}</div>
    <hr>
    <form action="addsongs" method="post">
        @csrf
        <div class="form-group">
          <label for="exampleInputEmail1">Song-Name</label>
          <input type="text" name="name" class="form-control" id="exampleInputEmail1" aria-describedby="name" placeholder="type in name">
        </div>
        <div class="form-group">
          <label for="exampleInputPassword1">songData</label>
          <textarea type="text" name="description" class="form-control" id="exampleInputPassword1" placeholder="type in data"></textarea>
        </div>
        <div class="form-group">
          <label for="exampleInputPassword1">songData</label>
          <textarea type="text" name="songdata" class="form-control" id="exampleInputPassword1" placeholder="type in data"></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Submit</button>
      </form>
    <hr>
    <a href="{{ url('./home') }}" class="btn btn-success float-right">home</a>
</div>
        
@endsection
