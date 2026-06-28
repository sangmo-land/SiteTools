<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\User;
use App\Services\ReceiptQueryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class ReceiptQueryServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_the_answer_and_a_sanitised_table(): void
    {
        config()->set('services.anthropic.key', 'test-key');

        $user = $this->userWithExpense();

        // Claude returns a table with a short row (should be padded) and an
        // extra trailing column value (should be trimmed to the column count).
        $reply = json_encode([
            'answer' => 'You have one pending receipt totalling 14 500 FCFA.',
            'table' => [
                'title' => 'Pending receipts',
                'columns' => ['Date', 'Vendor', 'Total'],
                'rows' => [
                    ['2026-06-23', 'BuildMart', '14 500 FCFA', 'extra'],
                    ['Total'],
                ],
            ],
        ]);

        $result = $this->serviceReturning($reply)->answer($user, 'List my pending receipts.');

        $this->assertSame('You have one pending receipt totalling 14 500 FCFA.', $result['answer']);
        $this->assertSame(1, $result['recordCount']);
        $this->assertSame('Pending receipts', $result['table']['title']);
        $this->assertSame(['Date', 'Vendor', 'Total'], $result['table']['columns']);
        $this->assertSame(['2026-06-23', 'BuildMart', '14 500 FCFA'], $result['table']['rows'][0]);
        $this->assertSame(['Total', '', ''], $result['table']['rows'][1]);
    }

    public function test_it_returns_a_null_table_for_a_plain_answer(): void
    {
        config()->set('services.anthropic.key', 'test-key');

        $user = $this->userWithExpense();

        $reply = json_encode([
            'answer' => 'Your most expensive vendor is BuildMart.',
            'table' => null,
        ]);

        $result = $this->serviceReturning($reply)->answer($user, 'Who is my top vendor?');

        $this->assertSame('Your most expensive vendor is BuildMart.', $result['answer']);
        $this->assertNull($result['table']);
    }

    public function test_it_falls_back_to_raw_text_when_the_reply_is_not_json(): void
    {
        config()->set('services.anthropic.key', 'test-key');

        $user = $this->userWithExpense();

        $result = $this->serviceReturning('Sorry, I could not parse that.')
            ->answer($user, 'anything');

        $this->assertSame('Sorry, I could not parse that.', $result['answer']);
        $this->assertNull($result['table']);
    }

    public function test_it_short_circuits_when_there_are_no_records(): void
    {
        config()->set('services.anthropic.key', 'test-key');

        $service = Mockery::mock(ReceiptQueryService::class)
            ->makePartial()
            ->shouldAllowMockingProtectedMethods();
        $service->shouldNotReceive('requestAnswer');

        $result = $service->answer(User::factory()->create(), 'List everything.');

        $this->assertSame(0, $result['recordCount']);
        $this->assertNull($result['table']);
    }

    private function userWithExpense(): User
    {
        $user = User::factory()->create();

        Expense::create([
            'user_id' => $user->id,
            'entry_type' => 'receipt',
            'title' => 'Receipt - BuildMart',
            'vendor' => 'BuildMart',
            'category' => 'Other',
            'purchase_date' => '2026-06-23',
            'total_amount' => 14500,
            'payment_method' => 'Cash',
            'status' => 'pending',
        ]);

        return $user;
    }

    private function serviceReturning(string $replyText): ReceiptQueryService
    {
        $message = (object) [
            'content' => [
                (object) ['type' => 'text', 'text' => $replyText],
            ],
        ];

        $service = Mockery::mock(ReceiptQueryService::class)
            ->makePartial()
            ->shouldAllowMockingProtectedMethods();
        $service->shouldReceive('requestAnswer')->once()->andReturn($message);

        return $service;
    }
}
