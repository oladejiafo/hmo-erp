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
  .info-block { margin-bottom: 12px; }

  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  thead th { background: #f0f4f8; padding: 8px 10px; text-align: left; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; }
  tbody td { padding: 8px 10px; border-bottom: 1px solid #edf2f7; }
  tbody tr:last-child td { border-bottom: none; }
  .text-right { text-align: right; }

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
  .status-sent { background: #cfe2ff; color: #0a3475; }
  .status-draft { background: #e2e3e5; color: #41464b; }
  .status-overdue { background: #f8d7da; color: #58151c; }
</style>
</head>
<body>

<div class="header">
  <h1>{{ config('hmo.name', 'HMO NAME') }}</h1>
  <div class="sub">Corporate Invoice</div>
  <div class="ref">
    <div class="sub">Invoice Number</div>
    <div class="ref-number">{{ $invoice->invoice_number }}</div>
    <div class="sub" style="margin-top:4px">Generated: {{ now()->format('d M Y H:i') }}</div>
  </div>
</div>

<div class="section">
  <div class="grid-2">
    <div class="col">
      <div class="label">Billed To</div>
      <div class="value">{{ $invoice->corporate->name ?? 'N/A' }}</div>
      <div class="info-block"></div>
      @if($invoice->plan)
      <div class="label">Plan</div>
      <div class="value">{{ $invoice->plan->plan_name }}</div>
      @endif
    </div>
    <div class="col">
      <div class="label">Status</div>
      <div class="value">
        <span class="status-badge status-{{ $invoice->status }}">{{ ucfirst($invoice->status) }}</span>
      </div>
      <div class="info-block"></div>
      <div class="label">Issue Date</div>
      <div class="value">{{ $invoice->issue_date?->format('d M Y') }}</div>
      <div class="info-block"></div>
      <div class="label">Due Date</div>
      <div class="value">{{ $invoice->due_date?->format('d M Y') }}</div>
    </div>
  </div>
</div>

@if($invoice->period_start && $invoice->period_end)
<div class="section">
  <div class="label">Billing Period</div>
  <div class="value">{{ $invoice->period_start->format('d M Y') }} &ndash; {{ $invoice->period_end->format('d M Y') }}</div>
</div>
@endif

<div class="section">
  <div class="section-title">Details</div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>{{ $invoice->description ?? 'Corporate HMO premium' }}</td>
        <td class="text-right">{{ number_format($invoice->subtotal, 2) }}</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="summary-box">
  <div class="summary-row">
    <div class="summary-label">Subtotal</div>
    <div class="summary-value">{{ number_format($invoice->subtotal, 2) }}</div>
  </div>
  <div class="summary-row">
    <div class="summary-label">Tax</div>
    <div class="summary-value">{{ number_format($invoice->tax_amount, 2) }}</div>
  </div>
  <div class="summary-row total">
    <div class="summary-label">Total Due</div>
    <div class="summary-value">{{ number_format($invoice->total_amount, 2) }}</div>
  </div>
</div>

<div class="footer">
  <div class="left">{{ config('hmo.name', 'HMO NAME') }}</div>
  <div class="right">Invoice {{ $invoice->invoice_number }}</div>
</div>

</body>
</html>
