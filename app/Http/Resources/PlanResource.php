<?php
/**
 * FILE: app/Http/Resources/PlanResource.php
 */

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                           => $this->id,
            'corporate_id'                 => $this->corporate_id,
            'plan_name'                    => $this->plan_name,
            'plan_code'                    => $this->plan_code,
            'plan_type'                    => $this->plan_type,
            'tier'                         => $this->tier,
            'tier_label'                   => $this->tier_label,
            'status'                       => $this->status,
            'status_label'                 => $this->status_label,

            // Benefit limits
            'max_benefit_value'            => (float) $this->max_benefit_value,
            'inpatient_limit'              => $this->inpatient_limit  ? (float) $this->inpatient_limit  : null,
            'outpatient_limit'             => $this->outpatient_limit ? (float) $this->outpatient_limit : null,
            'surgery_limit'                => $this->surgery_limit    ? (float) $this->surgery_limit    : null,
            'maternity_limit'              => $this->maternity_limit  ? (float) $this->maternity_limit  : null,
            'dental_limit'                 => $this->dental_limit     ? (float) $this->dental_limit     : null,
            'optical_limit'                => $this->optical_limit    ? (float) $this->optical_limit    : null,
            'drug_limit'                   => $this->drug_limit       ? (float) $this->drug_limit       : null,

            // Coverage flags
            'dental_covered'               => (bool) $this->dental_covered,
            'optical_covered'              => (bool) $this->optical_covered,
            'maternity_covered'            => (bool) $this->maternity_covered,
            'surgery_covered'              => (bool) $this->surgery_covered,
            'physiotherapy_covered'        => (bool) $this->physiotherapy_covered,
            'mental_health_covered'        => (bool) $this->mental_health_covered,

            // Drug
            'drug_coverage'                => $this->drug_coverage,

            // Dependents & financial
            'max_dependents'               => $this->max_dependents,
            'copay_amount'                 => (float) $this->copay_amount,
            'copay_percentage'             => (float) $this->copay_percentage,
            'waiting_period_days'          => $this->waiting_period_days,

            // Pre-auth thresholds
            'preauth_threshold_inpatient'  => $this->preauth_threshold_inpatient  ? (float) $this->preauth_threshold_inpatient  : null,
            'preauth_threshold_surgery'    => $this->preauth_threshold_surgery    ? (float) $this->preauth_threshold_surgery    : null,
            'preauth_threshold_drugs'      => $this->preauth_threshold_drugs      ? (float) $this->preauth_threshold_drugs      : null,

            // Dates
            'effective_date'               => $this->effective_date?->format('Y-m-d'),
            'expiry_date'                  => $this->expiry_date?->format('Y-m-d'),

            // Meta
            'description'                  => $this->description,
            'notes'                        => $this->notes,
            'enrollee_count'               => $this->enrollee_count,

            // Relationships (loaded on demand)
            'corporate'                    => $this->whenLoaded('corporate', fn () => [
                'id'   => $this->corporate->id,
                'name' => $this->corporate->name,
                'code' => $this->corporate->code,
            ]),
            'benefit_items'                => $this->whenLoaded('benefitItems', fn () =>
                $this->benefitItems->groupBy('benefit_category')->map(fn ($items, $cat) => [
                    'category'       => $cat,
                    'category_label' => $items->first()->category_label,
                    'items'          => $items->map(fn ($i) => [
                        'id'                 => $i->id,
                        'benefit_name'       => $i->benefit_name,
                        'coverage_type'      => $i->coverage_type,
                        'coverage_label'     => $i->coverage_label,
                        'annual_limit'       => $i->annual_limit       ? (float) $i->annual_limit       : null,
                        'per_visit_limit'    => $i->per_visit_limit    ? (float) $i->per_visit_limit    : null,
                        'annual_visit_limit' => $i->annual_visit_limit,
                        'requires_preauth'   => (bool) $i->requires_preauth,
                        'waiting_period_days'=> $i->waiting_period_days,
                        'notes'              => $i->notes,
                    ])->values(),
                ])->values()
            ),

            'created_at'                   => $this->created_at?->toISOString(),
            'updated_at'                   => $this->updated_at?->toISOString(),
        ];
    }
}


// =========================================================================
// FILE: app/Http/Requests/Plan/StorePlanRequest.php
// =========================================================================

namespace App\Http\Requests\Plan;

use Illuminate\Foundation\Http\FormRequest;

class StorePlanRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'plan_name'                    => ['required', 'string', 'max:150'],
            'plan_code'                    => ['nullable', 'string', 'max:50', 'unique:plans,plan_code'],
            'plan_type'                    => ['required', 'in:individual,family,group'],
            'tier'                         => ['required', 'in:basic,standard,premium,executive'],
            'max_benefit_value'            => ['required', 'numeric', 'min:0'],
            'inpatient_limit'              => ['nullable', 'numeric', 'min:0'],
            'outpatient_limit'             => ['nullable', 'numeric', 'min:0'],
            'surgery_limit'                => ['nullable', 'numeric', 'min:0'],
            'maternity_limit'              => ['nullable', 'numeric', 'min:0'],
            'dental_limit'                 => ['nullable', 'numeric', 'min:0'],
            'optical_limit'                => ['nullable', 'numeric', 'min:0'],
            'drug_limit'                   => ['nullable', 'numeric', 'min:0'],
            'dental_covered'               => ['boolean'],
            'optical_covered'              => ['boolean'],
            'maternity_covered'            => ['boolean'],
            'surgery_covered'              => ['boolean'],
            'physiotherapy_covered'        => ['boolean'],
            'mental_health_covered'        => ['boolean'],
            'drug_coverage'                => ['in:none,formulary,all'],
            'max_dependents'               => ['nullable', 'integer', 'min:0', 'max:20'],
            'copay_amount'                 => ['numeric', 'min:0'],
            'copay_percentage'             => ['numeric', 'min:0', 'max:100'],
            'waiting_period_days'          => ['integer', 'min:0'],
            'preauth_threshold_inpatient'  => ['nullable', 'numeric', 'min:0'],
            'preauth_threshold_surgery'    => ['nullable', 'numeric', 'min:0'],
            'preauth_threshold_drugs'      => ['nullable', 'numeric', 'min:0'],
            'effective_date'               => ['nullable', 'date'],
            'expiry_date'                  => ['nullable', 'date', 'after_or_equal:effective_date'],
            'status'                       => ['in:active,inactive,discontinued'],
            'description'                  => ['nullable', 'string'],
            'notes'                        => ['nullable', 'string'],

            // Benefit items (optional on create - can be added after)
            'benefit_items'                        => ['nullable', 'array'],
            'benefit_items.*.benefit_category'     => ['required', 'string'],
            'benefit_items.*.benefit_name'         => ['required', 'string', 'max:150'],
            'benefit_items.*.coverage_type'        => ['required', 'in:covered,not_covered,limited,requires_preauth,copay_applies'],
            'benefit_items.*.annual_limit'         => ['nullable', 'numeric', 'min:0'],
            'benefit_items.*.per_visit_limit'      => ['nullable', 'numeric', 'min:0'],
            'benefit_items.*.annual_visit_limit'   => ['nullable', 'integer', 'min:0'],
            'benefit_items.*.requires_preauth'     => ['boolean'],
            'benefit_items.*.waiting_period_days'  => ['integer', 'min:0'],
            'benefit_items.*.notes'                => ['nullable', 'string'],
            'benefit_items.*.sort_order'           => ['integer', 'min:0'],
        ];
    }
}


// =========================================================================
// FILE: app/Http/Requests/Plan/UpdatePlanRequest.php
// =========================================================================

namespace App\Http\Requests\Plan;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePlanRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $planId = $this->route('plan');

        return [
            'plan_name'                    => ['sometimes', 'string', 'max:150'],
            'plan_code'                    => ['sometimes', 'string', 'max:50', Rule::unique('plans', 'plan_code')->ignore($planId)],
            'plan_type'                    => ['sometimes', 'in:individual,family,group'],
            'tier'                         => ['sometimes', 'in:basic,standard,premium,executive'],
            'max_benefit_value'            => ['sometimes', 'numeric', 'min:0'],
            'inpatient_limit'              => ['nullable', 'numeric', 'min:0'],
            'outpatient_limit'             => ['nullable', 'numeric', 'min:0'],
            'surgery_limit'                => ['nullable', 'numeric', 'min:0'],
            'maternity_limit'              => ['nullable', 'numeric', 'min:0'],
            'dental_limit'                 => ['nullable', 'numeric', 'min:0'],
            'optical_limit'                => ['nullable', 'numeric', 'min:0'],
            'drug_limit'                   => ['nullable', 'numeric', 'min:0'],
            'dental_covered'               => ['boolean'],
            'optical_covered'              => ['boolean'],
            'maternity_covered'            => ['boolean'],
            'surgery_covered'              => ['boolean'],
            'physiotherapy_covered'        => ['boolean'],
            'mental_health_covered'        => ['boolean'],
            'drug_coverage'                => ['in:none,formulary,all'],
            'max_dependents'               => ['nullable', 'integer', 'min:0', 'max:20'],
            'copay_amount'                 => ['numeric', 'min:0'],
            'copay_percentage'             => ['numeric', 'min:0', 'max:100'],
            'waiting_period_days'          => ['integer', 'min:0'],
            'preauth_threshold_inpatient'  => ['nullable', 'numeric', 'min:0'],
            'preauth_threshold_surgery'    => ['nullable', 'numeric', 'min:0'],
            'preauth_threshold_drugs'      => ['nullable', 'numeric', 'min:0'],
            'effective_date'               => ['nullable', 'date'],
            'expiry_date'                  => ['nullable', 'date', 'after_or_equal:effective_date'],
            'status'                       => ['in:active,inactive,discontinued'],
            'description'                  => ['nullable', 'string'],
            'notes'                        => ['nullable', 'string'],
        ];
    }
}