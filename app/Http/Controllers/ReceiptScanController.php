<?php

namespace App\Http\Controllers;

use App\Services\AmazonTextractReceiptScanner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class ReceiptScanController extends Controller
{
    public function __invoke(Request $request, AmazonTextractReceiptScanner $scanner): JsonResponse
    {
        $data = $request->validate([
            'receipt' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf,tif,tiff', 'max:10240'],
        ]);

        if (blank(config('services.textract.key')) || blank(config('services.textract.secret'))) {
            return response()->json([
                'message' => 'Amazon Textract is not configured yet.',
            ], 503);
        }

        try {
            return response()->json($scanner->scan($data['receipt']));
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Amazon Textract could not read this receipt. Please try a clearer image or enter the details manually.',
            ], 502);
        }
    }
}
