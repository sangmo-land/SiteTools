<?php

namespace App\Http\Controllers;

use App\Models\Material;
use App\Services\AmazonTextractReceiptScanner;
use App\Services\ClaudeLineItemClassifier;
use Aws\Exception\AwsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Throwable;

class ReceiptScanController extends Controller
{
    public function __invoke(
        Request $request,
        AmazonTextractReceiptScanner $scanner,
        ClaudeLineItemClassifier $classifier,
    ): JsonResponse {
        $validator = Validator::make($request->all(), [
            'receipt' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
        ], [
            'receipt.mimes' => 'Use a JPG or PNG receipt image. PDF/TIFF receipts need an S3-based Textract flow.',
            'receipt.max' => 'Use a JPG or PNG receipt image under 5 MB for this direct scanner.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'The receipt could not be scanned.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        if (blank(config('services.textract.key')) || blank(config('services.textract.secret'))) {
            return response()->json([
                'message' => 'Amazon Textract is not configured yet.',
            ], 503);
        }

        try {
            $scan = $scanner->scan($data['receipt']);
            $scan['items'] = $classifier->classify($scan['items'] ?? [], $this->materialCatalog());

            return response()->json($scan);
        } catch (AwsException $exception) {
            report($exception);

            return response()->json([
                'message' => $this->messageForAwsException($exception),
            ], $this->statusForAwsException($exception));
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Amazon Textract could not read this receipt. Please try a clearer image or enter the details manually.',
            ], 502);
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function materialCatalog(): array
    {
        if (! app(ClaudeLineItemClassifier::class)->isConfigured()) {
            return [];
        }

        return Material::query()
            ->where('is_active', true)
            ->get(['id', 'name', 'category', 'unit'])
            ->map(fn (Material $material): array => [
                'id' => $material->id,
                'name' => $material->name,
                'category' => $material->category,
                'unit' => $material->unit,
            ])
            ->all();
    }

    private function messageForAwsException(AwsException $exception): string
    {
        return match ($exception->getAwsErrorCode()) {
            'AccessDenied', 'AccessDeniedException', 'UnauthorizedOperation' => 'Amazon Textract permission is missing. Allow textract:AnalyzeExpense for this AWS access key.',
            'InvalidClientTokenId', 'InvalidSignatureException', 'MissingAuthenticationTokenException', 'SignatureDoesNotMatch', 'UnrecognizedClientException' => 'Amazon Textract rejected the AWS credentials. Check AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and clear the Laravel config cache.',
            'BadDocumentException', 'DocumentTooLargeException', 'InvalidParameterException', 'UnsupportedDocumentException' => 'Amazon Textract could not read this file. Use a clear JPG or PNG receipt image under 5 MB.',
            'ProvisionedThroughputExceededException', 'ThrottlingException', 'TooManyRequestsException' => 'Amazon Textract is busy right now. Try scanning again in a moment.',
            default => 'Amazon Textract could not read this receipt. Check the AWS region, credentials, and receipt image, then try again.',
        };
    }

    private function statusForAwsException(AwsException $exception): int
    {
        return match ($exception->getAwsErrorCode()) {
            'AccessDenied', 'AccessDeniedException', 'UnauthorizedOperation' => 403,
            'InvalidClientTokenId', 'InvalidSignatureException', 'MissingAuthenticationTokenException', 'SignatureDoesNotMatch', 'UnrecognizedClientException' => 401,
            'BadDocumentException', 'DocumentTooLargeException', 'InvalidParameterException', 'UnsupportedDocumentException' => 422,
            'ProvisionedThroughputExceededException', 'ThrottlingException', 'TooManyRequestsException' => 429,
            default => 502,
        };
    }
}
