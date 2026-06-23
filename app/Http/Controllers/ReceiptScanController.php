<?php

namespace App\Http\Controllers;

use App\Services\OpenAIReceiptScanner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class ReceiptScanController extends Controller
{
    public function __invoke(Request $request, OpenAIReceiptScanner $scanner): JsonResponse
    {
        $data = $request->validate([
            'receipt' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:10240'],
        ]);

        if (blank(config('services.openai.api_key'))) {
            return response()->json([
                'message' => 'AI receipt scanning is not configured yet.',
            ], 503);
        }

        try {
            return response()->json($scanner->scan($data['receipt']));
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'The AI could not read this receipt. Please try a clearer image or enter the details manually.',
            ], 502);
        }
    }
}
