<?php

namespace App\Http\Controllers;

use App\Models\Material;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Lets users add new materials (items and their unit prices) to the catalogue
 * straight from the Expenses page. The price entered here becomes the default
 * that prefills the expense form when the material is selected; editing or
 * removing existing materials stays in the Filament admin.
 */
class MaterialController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('materials', 'name')],
            'category' => ['required', Rule::in(ExpenseController::CATEGORIES)],
            'unit' => ['required', 'string', 'max:30'],
            'default_unit_price' => ['required', 'numeric', 'min:0', 'max:999999999'],
        ]);

        Material::create([
            ...$data,
            'is_active' => true,
        ]);

        return back()->with('status', 'Material added.');
    }
}
