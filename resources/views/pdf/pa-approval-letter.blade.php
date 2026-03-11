<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>PA Approval Letter - {{ $pa->pa_code }}</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body { 
            font-family: 'DejaVu Sans', 'Helvetica', 'Arial', sans-serif; 
            line-height: 1.3;
            color: #333;
            background: #fff;
            padding: 30px;
        }
        
        .header { 
            background: #0f4c81;
            color: white;
            padding: 20px;
            margin-bottom: 25px;
        }
        
        .hmo-name {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 5px;
        }
        
        .hmo-details {
            color: rgba(255,255,255,0.9);
            font-size: 12px;
        }
        
        .title-section {
            margin-bottom: 20px;
        }
        
        .title-section h1 {
            color: #0f4c81;
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .pa-code-box {
            background: #f5f5f5;
            border: 1px solid #ddd;
            padding: 10px 15px;
            margin: 15px 0;
        }
        
        .pa-code-box .label {
            font-size: 11px;
            color: #666;
            text-transform: uppercase;
        }
        
        .pa-code-box .code {
            font-size: 22px;
            font-weight: 700;
            color: #0f4c81;
            letter-spacing: 1px;
            font-family: monospace;
        }
        
        .greeting {
            margin-bottom: 15px;
        }
        
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0; 
        }
        
        td { 
            padding: 8px 5px; 
            border-bottom: 1px solid #eee;
        }
        
        td:first-child { 
            font-weight: 600; 
            width: 30%; 
        }
        
        .amount {
            font-size: 16px;
            font-weight: 700;
            color: #0f4c81;
        }
        
        .note-box {
            background: #fff8e7;
            border-left: 3px solid #ed8936;
            padding: 12px;
            margin: 15px 0;
            font-size: 13px;
        }
        
        .signature-section {
            margin: 25px 0;
            padding-top: 15px;
            border-top: 1px solid #ddd;
        }
        
        .signature-line {
            border-bottom: 1px solid #333;
            width: 250px;
            margin: 10px 0;
            height: 25px;
        }
        
        .footer { 
            margin-top: 30px; 
            padding-top: 15px;
            text-align: center; 
            color: #666; 
            font-size: 11px; 
            border-top: 1px solid #eee;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="hmo-name">{{ $hmoName }}</div>
        @if($hmoAddress || $hmoPhone || $hmoEmail)
            <div class="hmo-details">
                @if($hmoAddress) {{ $hmoAddress }} @endif
                @if($hmoPhone && $hmoAddress) | @endif
                @if($hmoPhone) Tel: {{ $hmoPhone }} @endif
                @if($hmoEmail && ($hmoAddress || $hmoPhone)) | @endif
                @if($hmoEmail) {{ $hmoEmail }} @endif
            </div>
        @endif
    </div>

    <div class="title-section">
        <h1>PRE-AUTHORISATION APPROVAL</h1>
        
        <div class="pa-code-box">
            <div class="label">PA Code</div>
            <div class="code">{{ $pa->pa_code }}</div>
        </div>
        
        <p><strong>Issued:</strong> {{ now()->format('d M Y') }} | <strong>Valid Until:</strong> {{ $pa->expires_at?->format('d M Y') }}</p>
    </div>

    <div class="greeting">
        <strong>Dear Provider,</strong>
    </div>
    
    <p>Pre-authorisation has been granted for the following:</p>

    <table>
        <tr><td>Patient:</td><td><strong>{{ $pa->enrollee->first_name }} {{ $pa->enrollee->last_name }}</strong> ({{ $pa->enrollee->enrollee_id }})</td></tr>
        <tr><td>Provider:</td><td>{{ $pa->hcp->name }}</td></tr>
        <tr><td>Service:</td><td>{{ $pa->service_type_label ?? $pa->service_type }}</td></tr>
        <tr><td>Diagnosis:</td><td>{{ $pa->diagnosis_description }}</td></tr>
        <tr><td>Approved Amount:</td><td class="amount">{!! html_entity_decode($currencySymbol) !!}{{ number_format($pa->approved_amount ?? $pa->estimated_amount, 2) }}</td></tr>
    </table>

    <p>Please quote PA code <strong>{{ $pa->pa_code }}</strong> when submitting the claim.</p>

    @if($pa->approval_note)
        <div class="note-box">
            <strong>Note:</strong> {{ $pa->approval_note }}
        </div>
    @endif

    <div class="signature-section">
        <div class="signature-line"></div>
        <div><strong>{{ $pa->reviewedBy?->name ?? 'System' }}</strong></div>
        <div style="font-size: 12px; color: #666;">{{ $pa->reviewed_at?->format('d M Y H:i') }}</div>
    </div>

    <div class="footer">
        <p>{{ $hmoName }} - System generated document</p>
    </div>
</body>
</html>