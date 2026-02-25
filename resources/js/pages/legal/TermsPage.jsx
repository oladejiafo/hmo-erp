import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, AlertCircle, Scale, CreditCard, Ban, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function TermsPage() {
    const { user } = useAuth();

    return (
        <div style={{ background: '#f4f6fa', minHeight: '100vh' }}>
            {/* Top bar matching AppLayout */}
            <div style={{ 
                height: 64, 
                background: '#fff', 
                borderBottom: '1px solid #dee2e6',
                display: 'flex',
                alignItems: 'center',
                padding: '0 24px'
            }}>
               <Link to={user ? "/" : "/login"} className="btn btn-outline-secondary btn-sm">
                    <ArrowLeft size={16} className="me-1" /> 
                    {user ? 'Go Back to Dashboard' : 'Back to Login'}
                </Link>
                <span className="ms-3 fw-bold">Terms and Conditions</span>
            </div>

            <div className="container py-4">
                <div className="card shadow-sm">
                    <div className="card-header bg-white py-3">
                        <h4 className="mb-0 fw-bold d-flex align-items-center gap-2">
                            <FileText size={24} className="text-primary" /> Terms and Conditions
                        </h4>
                        <p className="text-muted small mb-0">Last updated: February 25, 2026</p>
                    </div>
                    <div className="card-body p-4">
                        <div className="mb-5">
                            <h5 className="d-flex align-items-center gap-2 mb-3">
                                <Scale size={20} className="text-primary" /> 1. Acceptance of Terms
                            </h5>
                            <p className="text-muted" style={{ lineHeight: 1.7 }}>
                                By accessing or using the G8 Brooks HMO ERP System ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree to all terms, you may not access or use the Platform.
                            </p>
                        </div>

                        <div className="mb-5">
                            <h5 className="d-flex align-items-center gap-2 mb-3">
                                <Shield size={20} className="text-primary" /> 2. User Accounts
                            </h5>
                            <ul className="text-muted" style={{ lineHeight: 1.7 }}>
                                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                                <li>You are responsible for all activities that occur under your account</li>
                                <li>You must notify us immediately of any unauthorized account use</li>
                                <li>We reserve the right to suspend or terminate accounts for violations</li>
                                <li>Each user must have a unique account - shared accounts are prohibited</li>
                            </ul>
                        </div>

                        <div className="mb-5">
                            <h5 className="d-flex align-items-center gap-2 mb-3">
                                <CreditCard size={20} className="text-primary" /> 3. Fees and Payments
                            </h5>
                            <p className="text-muted" style={{ lineHeight: 1.7 }}>
                                Certain features may require payment of fees. All fees are non-refundable unless required by law. We reserve the right to change our fees with reasonable notice.
                            </p>
                        </div>

                        <div className="mb-5">
                            <h5 className="d-flex align-items-center gap-2 mb-3">
                                <Ban size={20} className="text-primary" /> 4. Prohibited Activities
                            </h5>
                            <p className="fw-semibold mb-2">You may not use the Platform to:</p>
                            <ul className="text-muted" style={{ lineHeight: 1.7 }}>
                                <li>Violate any laws or regulations</li>
                                <li>Submit false or fraudulent claims</li>
                                <li>Impersonate any person or entity</li>
                                <li>Interfere with the security of the Platform</li>
                                <li>Attempt to gain unauthorized access to other accounts</li>
                                <li>Use the Platform for any unlawful purpose</li>
                                <li>Transmit malware or harmful code</li>
                            </ul>
                        </div>

                        <div className="mb-5">
                            <h5 className="d-flex align-items-center gap-2 mb-3">
                                <AlertCircle size={20} className="text-primary" /> 5. Data Accuracy
                            </h5>
                            <p className="text-muted" style={{ lineHeight: 1.7 }}>
                                You are responsible for ensuring that all information provided through the Platform is accurate, current, and complete. We are not liable for any issues arising from inaccurate information.
                            </p>
                        </div>

                        <div className="mb-5">
                            <h5 className="d-flex align-items-center gap-2 mb-3">6. Intellectual Property</h5>
                            <p className="text-muted" style={{ lineHeight: 1.7 }}>
                                The Platform and its original content, features, and functionality are owned by G8 Brooks and are protected by international copyright, trademark, and other intellectual property laws.
                            </p>
                        </div>

                        <div className="mb-5">
                            <h5 className="d-flex align-items-center gap-2 mb-3">7. Termination</h5>
                            <p className="text-muted" style={{ lineHeight: 1.7 }}>
                                We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
                            </p>
                        </div>

                        <div className="mb-5">
                            <h5 className="d-flex align-items-center gap-2 mb-3">8. Limitation of Liability</h5>
                            <p className="text-muted" style={{ lineHeight: 1.7 }}>
                                To the maximum extent permitted by law, G8 Brooks shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Platform.
                            </p>
                        </div>

                        <div className="mb-5">
                            <h5 className="d-flex align-items-center gap-2 mb-3">9. Changes to Terms</h5>
                            <p className="text-muted" style={{ lineHeight: 1.7 }}>
                                We reserve the right to modify these terms at any time. We will provide notice of significant changes. Your continued use of the Platform after such modifications constitutes acceptance of the updated terms.
                            </p>
                        </div>

                        <div className="mb-4">
                            <h5 className="d-flex align-items-center gap-2 mb-3">10. Contact Information</h5>
                            <div className="bg-light p-3 rounded">
                                <p className="mb-1"><strong>G8 Brooks Technologies</strong></p>
                                <p className="mb-1">Email: legal@g8brooks.com</p>
                                <p className="mb-1">Phone: +234 (0) 123 456 7890</p>
                                <p className="mb-0">Address: 25 Technology Avenue, Victoria Island, Lagos, Nigeria</p>
                            </div>
                        </div>

                        <div className="text-muted small border-top pt-3 mt-3">
                            <p className="mb-0">© {new Date().getFullYear()} G8 Brooks. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}