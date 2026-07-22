/**
 * NEW FILE — resources/js/pages/public/PaymentReturnPage.jsx
 * Flutterwave redirects the browser here after checkout with
 * ?status=&tx_ref=&transaction_id= as query params. This calls the
 * server-side verify endpoint, it never trusts these query params
 * directly, they are just what tells it which payment to go check.
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { confirmRetailPayment } from '../../api/index';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function PaymentReturnPage() {
    const [params] = useSearchParams();
    const [result, setResult] = useState(null);

    const verifyMutation = useMutation({
        mutationFn: () => confirmRetailPayment({
            transaction_id: params.get('transaction_id'),
            tx_ref: params.get('tx_ref'),
        }),
        onSuccess: (res) => setResult(res.data.status),
        onError: () => setResult('failed'),
    });

    useEffect(() => {
        if (params.get('transaction_id') && params.get('tx_ref')) {
            verifyMutation.mutate();
        } else {
            setResult('failed');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div style={pageStyle}>
            {!result && (
                <>
                    <Loader size={40} color="#0f4c81" />
                    <h2 style={titleStyle}>Confirming your payment…</h2>
                    <p style={textStyle}>This usually takes a few seconds.</p>
                </>
            )}
            {result === 'paid' && (
                <>
                    <CheckCircle size={48} color="#137333" />
                    <h2 style={titleStyle}>You're covered!</h2>
                    <p style={textStyle}>Your enrolment is active. Check your email for login details.</p>
                    <Link to="/login" style={ctaStyle}>Go to login</Link>
                </>
            )}
            {result === 'pending' && (
                <>
                    <Loader size={40} color="#e65100" />
                    <h2 style={titleStyle}>Still confirming…</h2>
                    <p style={textStyle}>If you completed payment, this will update shortly. You can safely close this page, we'll email you once it's confirmed.</p>
                </>
            )}
            {result === 'failed' && (
                <>
                    <XCircle size={48} color="#c5221f" />
                    <h2 style={titleStyle}>Something went wrong</h2>
                    <p style={textStyle}>We couldn't confirm your payment. Contact support if you were charged.</p>
                    <Link to="/support" style={ctaStyle}>Contact support</Link>
                </>
            )}
        </div>
    );
}

const pageStyle = { maxWidth: 420, margin: '80px auto', padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 };
const titleStyle = { fontSize: 20, fontWeight: 800, color: '#1a202c', margin: '10px 0 0' };
const textStyle = { fontSize: 13, color: '#718096' };
const ctaStyle = { marginTop: 10, padding: '10px 24px', borderRadius: 8, background: '#2d6a9f;', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 };
