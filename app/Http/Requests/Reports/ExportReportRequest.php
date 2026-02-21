<?php

namespace App\Http\Requests\Reports;

use Illuminate\Foundation\Http\FormRequest;

class ExportReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'report_type' => ['required', 'string', 'in:claims_aging,claims_by_hcp,cost_by_corporate'],
            'format' => ['nullable', 'string', 'in:csv,xlsx,pdf'],
            'year' => ['nullable', 'integer', 'min:2020', 'max:2030'],
            'month' => ['nullable', 'integer', 'min:1', 'max:12'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
        ];
    }
}