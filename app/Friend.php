<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Friend extends Model
{
    public function friends()
    {
        return $this->hasMany(User::class);
    }
    
    public function friendlistOf()
    {
        return $this->belongsTo(User::class);
    }
}
