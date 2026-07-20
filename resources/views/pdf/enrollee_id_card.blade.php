<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Health Insurance ID Card</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            margin: 0;
            padding: 0;
            background: #f0f4f8;
        }
        .card {
            width: 85mm;
            height: 54mm;
            background: linear-gradient(135deg, #0f4c81, #1565c0);
            border-radius: 10px;
            padding: 15px;
            color: white;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
            margin: 20px auto;
        }
        .decor-circle1 {
            position: absolute;
            top: -30px;
            right: -30px;
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: rgba(255,255,255,0.1);
        }
        .decor-circle2 {
            position: absolute;
            bottom: -20px;
            left: -20px;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(255,255,255,0.08);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            position: relative;
            z-index: 2;
        }
        .logo {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .logo-icon {
            width: 30px;
            height: 30px;
            background: rgba(255,255,255,0.2);
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 16px;
        }
        .logo-text {
            font-size: 12px;
            font-weight: bold;
        }
        .logo-subtext {
            font-size: 9px;
            opacity: 0.8;
        }
        .status {
            text-align: right;
        }
        .status-label {
            font-size: 9px;
            opacity: 0.7;
        }
        .status-badge {
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 10px;
            font-weight: bold;
            display: inline-block;
            
            background: {{ $enrollee->status === 'active' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)' }};
        }
        .member-info {
            margin-bottom: 15px;
            position: relative;
            z-index: 2;
        }
        .member-label {
            font-size: 9px;
            opacity: 0.7;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
        }
        .member-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 2px;
        }
        .member-details {
            font-size: 11px;
            opacity: 0.8;
        }
        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
            position: relative;
            z-index: 2;
        }
        .detail-label {
            font-size: 8px;
            opacity: 0.7;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
        }
        .detail-value {
            font-size: 11px;
            font-weight: 600;
        }
        .mono {
            font-family: monospace;
        }
        .hcp-box {
            background: rgba(255,255,255,0.12);
            border-radius: 6px;
            padding: 8px 10px;
            position: relative;
            z-index: 2;
            margin-top: 5px;
        }
        .hcp-label {
            font-size: 8px;
            opacity: 0.7;
            text-transform: uppercase;
            margin-bottom: 2px;
        }
        .hcp-name {
            font-size: 11px;
            font-weight: 600;
        }
        .hcp-phone {
            font-size: 9px;
            opacity: 0.8;
        }
        .footer {
            text-align: center;
            font-size: 7px;
            opacity: 0.6;
            margin-top: 5px;
            position: relative;
            z-index: 2;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="decor-circle1"></div>
        <div class="decor-circle2"></div>

        <!-- Header -->
        <div class="header">
            <div class="logo">
                <div class="logo-icon">🏥</div>
                <div>
                    <div class="logo-text">G8 NEXUM - HMO ERP</div>
                    <div class="logo-subtext">Health Insurance Card</div>
                </div>
            </div>
            <div class="status">
                <div class="status-label">STATUS</div>
                <div class="status-badge">
                    {{ strtoupper($enrollee->status) }}
                </div>
            </div>
        </div>

        <!-- Member Info -->
        <div class="member-info">
            <div class="member-label">Member Name</div>
            <div class="member-name">{{ $enrollee->first_name }} {{ $enrollee->last_name }}</div>
            <div class="member-details">
                {{ ucfirst($enrollee->gender) }} · DOB: {{ $enrollee->date_of_birth->format('d M Y') }}
            </div>
        </div>

        <!-- Details Grid -->
        <div class="details-grid">
            <div>
                <div class="detail-label">Member No.</div>
                <div class="detail-value mono">{{ $enrollee->enrollee_id }}</div>
            </div>
            <div>
                <div class="detail-label">Plan</div>
                <div class="detail-value">{{ $enrollee->plan->plan_name ?? 'N/A' }}</div>
            </div>
            <div>
                <div class="detail-label">Company</div>
                <div class="detail-value">{{ $enrollee->corporate->name ?? 'N/A' }}</div>
            </div>
            <div>
                <div class="detail-label">Valid Until</div>
                <div class="detail-value">{{ $enrollee->expiry_date->format('d M Y') }}</div>
            </div>
        </div>

        <!-- Primary HCP -->
        @if($enrollee->primaryHcp)
        <div class="hcp-box">
            <div class="hcp-label">Primary Healthcare Provider</div>
            <div class="hcp-name">{{ $enrollee->primaryHcp->name }}</div>
            @if($enrollee->primaryHcp->phone)
            <div class="hcp-phone">📞 {{ $enrollee->primaryHcp->phone }}</div>
            @endif
        </div>
        @endif

        <!-- Footer -->
        <div class="footer">
            NHIA Accredited · This card is valid only when presented by the named member
        </div>
    </div>

    @if($enrollee->dependents->count() > 0)
        @foreach($enrollee->dependents as $dependent)
        <div class="card" style="background: linear-gradient(135deg, #374151, #4b5563); margin-top: 10px;">
            <div class="decor-circle1"></div>
            <div class="decor-circle2"></div>
            
            <div class="header">
                <div class="logo">
                    <div class="logo-icon">👤</div>
                    <div>
                        <div class="logo-text">DEPENDENT CARD</div>
                        <div class="logo-subtext">{{ ucfirst($dependent->relationship) }}</div>
                    </div>
                </div>
                <div class="status">
                    <div class="status-label">STATUS</div>
                    <div class="status-badge" style="background: {{ $dependent->status === 'active' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)' }};">
                        {{ strtoupper($dependent->status) }}
                    </div>
                </div>
            </div>

            <div class="member-info">
                <div class="member-label">Dependent Name</div>
                <div class="member-name">{{ $dependent->first_name }} {{ $dependent->last_name }}</div>
                <div class="member-details">
                    {{ ucfirst($dependent->gender) }} · DOB: {{ $dependent->date_of_birth->format('d M Y') }}
                </div>
            </div>

            <div class="details-grid">
                <div>
                    <div class="detail-label">Member No.</div>
                    <div class="detail-value mono">{{ $dependent->dependent_id }}</div>
                </div>
                <div>
                    <div class="detail-label">Relationship</div>
                    <div class="detail-value">{{ ucfirst($dependent->relationship) }}</div>
                </div>
                <div>
                    <div class="detail-label">Principal</div>
                    <div class="detail-value">{{ $enrollee->first_name }} {{ $enrollee->last_name }}</div>
                </div>
                <div>
                    <div class="detail-label">Valid Until</div>
                    <div class="detail-value">{{ $enrollee->expiry_date->format('d M Y') }}</div>
                </div>
            </div>

            <div class="footer">
                Covered under {{ $enrollee->first_name }} {{ $enrollee->last_name }}'s policy
            </div>
        </div>
        @endforeach
    @endif
</body>
</html>