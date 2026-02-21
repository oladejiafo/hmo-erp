<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 11px; color: #1a1a2e; line-height: 1.5; }

  .header { background: #1e3a5f; color: white; padding: 24px 32px; margin-bottom: 24px; }
  .header h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  .header .sub { font-size: 11px; opacity: 0.75; }
  .header .ref { float: right; text-align: right; margin-top: -40px; }
  .header .ref .ref-number { font-size: 14px; font-weight: 700; background: rgba(255,255,255,0.15); padding: 8px 12px; border-radius: 4px; }

  .section { padding: 0 32px; margin-bottom: 20px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2d6a9f; border-bottom: 2px solid #2d6a9f; padding-bottom: 4px; margin-bottom: 12px; }

  .grid-2 { display: table; width: 100%; }
  .grid-2 .col { display: table-cell; width: 50%; vertical-align: top; padding-right: 16px; }
  .grid-2 .col:last-child { padding-right: 0; }

  .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; margin-bottom: 2px; }
  .value { font-size: 12px; font-weight: 600; color: #1a1a2e; }
  .value.mono { font-family: 'Courier New', monospace; }
  .info-block { margin-bottom: 12px; }

  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  thead th { background: #f0f4f8; padding: 8px 10px; text-align: left; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; }
  tbody td { padding: 8px 10px; border-bottom: 1px solid #edf2f7; }
  tbody tr:last-child td { border-bottom: none; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }

  .summary-box { background: #f0f4f8; border-radius: 6px; padding: 16px 20px; margin: 0 32px 20px; }
  .summary-row { display: table; width: 100%; padding: 4px 0; }
  .summary-label { display: table-cell; color: #555; }
  .summary-value { display: table-cell; text-align: right; font-weight: 600; }
  .summary-row.total { border-top: 2px solid #2d6a9f; margin-top: 8px; padding-top: 8px; font-size: 13px; color: #1e3a5f; }
  .summary-row.total .summary-value { color: #137333; font-size: 15px; }

  .footer { position: fixed; bottom: 0; left: 0; right: 0; background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 10px 32px; font-size: 9px; color: #888; display: table; width: 100%; }
  .footer .left { display: table-cell; }
  .footer .right { display: table-cell; text-align: right; }

  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
  .status-paid { background: #d1e7dd; color: #0a3622; }
</style>
</head>
<body>

{{-- ── Header ────────────────────────────────────────────────────────── --}}
<div class="header">
  <h1>{{ $company_name }}</h1>
  <div class="sub">Remittance Advice — Provider Payment Notification</div>
  <div class="ref">
    <div class="sub">Reference</div>
    <div class="ref-number">{{ $reference }}</div>
    <div class="sub" style="margin-top:4px">Generated: {{ $generated_at }}</div>
  </div>
</div>

{{-- ── Provider Details ─────────────────────────────────────────────── --}}
<div class="section">
  <div class="section-title">Provider Details</div>
  <div class="grid-2">
    <div class="col">
      <div class="info-block">
        <div class="label">Health Care Provider</div>
        <div class="value">{{ $hcp?->name ?? 'N/A' }}</div>
      </div>
      <div class="info-block">
        <div class="label">Provider Code</div>
        <div class="value mono">{{ $hcp?->hcp_code ?? 'N/A' }}</div>
      </div>
      <div class="info-block">
        <div class="label">Provider Type</div>
        <div class="value">{{ ucfirst($hcp?->type?->value ?? '—') }}</div>
      </div>
    </div>
    <div class="col">
      <div class="info-block">
        <div class="label">Bank Name</div>
        <div class="value">{{ $bank?->bank_name ?? 'Not provided' }}</div>
      </div>
      <div class="info-block">
        <div class="label">Account Name</div>
        <div class="value">{{ $bank?->account_name ?? '—' }}</div>
      </div>
      <div class="info-block">
        <div class="label">Account Number</div>
        <div class="value mono">{{ $bank?->account_number ?? '—' }}</div>
      </div>
    </div>
  </div>
</div>

{{-- ── Claim Details ────────────────────────────────────────────────── --}}
<div class="section">
  <div class="section-title">Claim Details</div>
  <div class="grid-2">
    <div class="col">
      <div class="info-block">
        <div class="label">Claim Number</div>
        <div class="value mono">{{ $claim?->claim_number ?? '—' }}</div>
      </div>
      <div class="info-block">
        <div class="label">Enrollee</div>
        <div class="value">
          {{ $claim?->enrollee?->first_name }} {{ $claim?->enrollee?->last_name }}
          <span style="font-size:10px;color:#666">({{ $claim?->enrollee?->enrollee_id }})</span>
        </div>
      </div>
      <div class="info-block">
        <div class="label">Service Date</div>
        <div class="value">{{ $claim?->service_date?->format('d M Y') ?? '—' }}</div>
      </div>
    </div>
    <div class="col">
      <div class="info-block">
        <div class="label">Batch Number</div>
        <div class="value mono">{{ $batch?->batch_number ?? '—' }}</div>
      </div>
      <div class="info-block">
        <div class="label">Payment Date</div>
        <div class="value">{{ $payment->paid_at?->format('d M Y') ?? now()->format('d M Y') }}</div>
      </div>
      <div class="info-block">
        <div class="label">Status</div>
        <div class="value">
          <span class="status-badge status-paid">Paid</span>
        </div>
      </div>
    </div>
  </div>
</div>

{{-- ── Services Breakdown ──────────────────────────────────────────── --}}
@if($claim?->items?->count() > 0)
<div class="section">
  <div class="section-title">Services Rendered</div>
  <table>
    <thead>
      <tr>
        <th>Service</th>
        <th>Category</th>
        <th class="text-center">Qty</th>
        <th class="text-right">Unit Price</th>
        <th class="text-right">Claimed</th>
        <th class="text-right">Approved</th>
      </tr>
    </thead>
    <tbody>
      @foreach ($claim->items as $item)
      <tr>
        <td>{{ $item->service_name }}</td>
        <td>{{ ucfirst($item->category) }}</td>
        <td class="text-center">{{ $item->quantity }}</td>
        <td class="text-right">₦{{ number_format($item->unit_price_claimed, 2) }}</td>
        <td class="text-right">₦{{ number_format($item->total_price_claimed, 2) }}</td>
        <td class="text-right" style="font-weight:600;">₦{{ number_format($item->amount_approved ?? 0, 2) }}</td>
      </tr>
      @endforeach
    </tbody>
  </table>
</div>
@endif

{{-- ── Payment Summary ──────────────────────────────────────────────── --}}
<div class="summary-box">
  <div class="summary-row">
    <div class="summary-label">Total Amount Claimed</div>
    <div class="summary-value">₦{{ number_format($claim?->total_amount_claimed ?? 0, 2) }}</div>
  </div>
  <div class="summary-row">
    <div class="summary-label">Total Amount Approved</div>
    <div class="summary-value">₦{{ number_format($claim?->total_amount_approved ?? 0, 2) }}</div>
  </div>
  @if($claim?->total_amount_claimed > $claim?->total_amount_approved)
  <div class="summary-row">
    <div class="summary-label">Deductions / Adjustments</div>
    <div class="summary-value" style="color:#c5221f">
      -₦{{ number_format(($claim?->total_amount_claimed ?? 0) - ($claim?->total_amount_approved ?? 0), 2) }}
    </div>
  </div>
  @endif
  <div class="summary-row total">
    <div class="summary-label">NET AMOUNT PAYABLE</div>
    <div class="summary-value">₦{{ number_format($payment->amount, 2) }}</div>
  </div>
</div>

{{-- ── Footer ──────────────────────────────────────────────────────── --}}
<div class="footer">
  <div class="left">
    This remittance advice is computer generated and does not require a signature. Queries: finance@hmosystem.ng
  </div>
  <div class="right">
    {{ $company_name }} · {{ $generated_at }}
  </div>
</div>

</body>
</html>