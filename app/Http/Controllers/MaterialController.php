<?php

namespace App\Http\Controllers;

use App\Models\Material;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Lets users manage the material catalogue (the items and their unit prices)
 * straight from the Expenses page, instead of the Filament admin panel. Prices
 * entered here become the default that prefills the expense form when a material
 * is selected.
 */
class MaterialController extends Controller
{
    public function store(Request $request)
    {
        $data = $this->validated($request);

        Material::create([
            ...$data,
            'is_active' => true,
        ]);

        return back()->with('status', 'Material added.');
    }

    public function update(Request $request, Material $material)
    {
        $material->update($this->validated($request, $material));

        return back()->with('status', 'Material updated.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Material $material = null): array
    {
        return $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('materials', 'name')->ignore($material?->id),
            ],
            'category' => ['required', Rule::in(ExpenseController::CATEGORIES)],
            'unit' => ['required', 'string', 'max:30'],
            'default_unit_price' => ['required', 'numeric', 'min:0', 'max:999999999'],
        ]);
    }
}
