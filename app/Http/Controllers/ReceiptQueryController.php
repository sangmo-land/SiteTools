<?php

namespace App\Http\Controllers;

use App\Services\ReceiptQueryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class ReceiptQueryController extends Controller
{
    public function __invoke(Request $request, ReceiptQueryService $service): JsonResponse
    {
        $data = $request->validate([
            'question' => ['required', 'string', 'max:1000'],
        ]);

        if (! $service->isConfigured()) {
            return response()->json([
                'message' => 'The receipt assistant is not configured yet. Add ANTHROPIC_API_KEY to enable it.',
            ], 503);
        }

        try {
            $result = $service->answer($request->user(), $data['question']);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'The receipt assistant is unavailable right now. Please try again in a moment.',
            ], 502);
        }

        return response()->json($result);
    }
}
