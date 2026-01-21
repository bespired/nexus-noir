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
use App\Http\Controllers\MediaController;
use App\Http\Controllers\ConfigController;
use App\Http\Controllers\AnimationController;


Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::apiResource('actions', ActionController::class);
Route::apiResource('characters', CharacterController::class);
Route::apiResource('animations', AnimationController::class);

Route::apiResource('clues', ClueController::class);
Route::apiResource('dialogs', DialogController::class);
Route::apiResource('notes', NoteController::class);
Route::post('scenes/batch-update', [SceneController::class, 'batchUpdate']);
Route::apiResource('scenes', SceneController::class);
Route::apiResource('sectors', SectorController::class);
Route::apiResource('media', MediaController::class)->only(['index', 'store', 'destroy']);
Route::get('configs', [ConfigController::class, 'index']);
Route::get('configs/{key}', [ConfigController::class, 'show']);
Route::put('configs/{key}', [ConfigController::class, 'update']);
Route::post('configs/upload-backdrop', [ConfigController::class, 'uploadBackdrop']);
