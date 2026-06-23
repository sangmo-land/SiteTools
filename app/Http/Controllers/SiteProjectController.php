<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SiteProjectController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'location' => ['nullable', 'string', 'max:180'],
            'client_name' => ['nullable', 'string', 'max:160'],
            'budget' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'start_date' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['planning', 'active', 'on_hold', 'completed'])],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $request->user()->siteProjects()->create($data);

        return back()->with('status', 'Project created.');
    }
}
