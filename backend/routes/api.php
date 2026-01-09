<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\ActionController;
use App\Http\Controllers\CharacterController;
use App\Http\Controllers\ClueController;
use App\Http\Controllers\DialogController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\SceneController;
use App\Http\Controllers\SectorController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::apiResource('actions', ActionController::class);
Route::apiResource('characters', CharacterController::class);
Route::apiResource('clues', ClueController::class);
Route::apiResource('dialogs', DialogController::class);
Route::apiResource('notes', NoteController::class);
Route::apiResource('scenes', SceneController::class);
Route::apiResource('sectors', SectorController::class);
