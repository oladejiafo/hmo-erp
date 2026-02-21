import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, Mail } from 'lucide-react';
import { PageHeader } from '../../components/ui';

export default function PrivacyPolicyPage() {
    return (
        <div className="container py-4">
            <div className="mb-4">
                <Link to="/" className="btn btn-outline-secondary btn-sm">
                    <ArrowLeft size={16} className="me-1" /> Back to Dashboard
                </Link>
            </div>

            <div className="card shadow-sm">
                <div className="card-header bg-white py-3">
                    <h4 className="mb-0 fw-bold">Privacy Policy</h4>
                    <p className="text-muted small mb-0">Last updated: February 21, 2026</p>
                </div>
                <div className="card-body p-4">
                    <div className="mb-5">
                        <h5 className="d-flex align-items-center gap-2 mb-3">
                            <Shield size={20} className="text-primary" /> Introduction
                        </h5>
                        <p className="text-muted" style={{ lineHeight: 1.7 }}>
                            G8 Brooks ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our HMO ERP System platform.
                        </p>
                        <p className="text-muted" style={{ lineHeight: 1.7 }}>
                            Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the platform.
                        </p>
                    </div>

                    <div className="mb-5">
                        <h5 className="d-flex align-items-center gap-2 mb-3">
                            <Database size={20} className="text-primary" /> Information We Collect
                        </h5>
                        <p className="fw-semibold mb-2">Personal Data:</p>
                        <ul className="text-muted mb-3" style={{ lineHeight: 1.7 }}>
                            <li>Contact information (name, email address, phone number)</li>
                            <li>Demographic information (age, gender, location)</li>
                            <li>Health information relevant to HMO services</li>
                            <li>Payment and billing information</li>
                            <li>Employment details for corporate clients</li>
                        </ul>
                        <p className="fw-semibold mb-2">Usage Data:</p>
                        <ul className="text-muted" style={{ lineHeight: 1.7 }}>
                            <li>Login activity and timestamps</li>
                            <li>Features accessed within the platform</li>
                            <li>Device information and IP addresses</li>
                            <li>Browser type and version</li>
                        </ul>
                    </div>

                    <div className="mb-5">
                        <h5 className="d-flex align-items-center gap-2 mb-3">
                            <Lock size={20} className="text-primary" /> How We Use Your Information
                        </h5>
                        <ul className="text-muted" style={{ lineHeight: 1.7 }}>
                            <li>To provide and maintain our HMO ERP services</li>
                            <li>To process claims and manage healthcare provider networks</li>
                            <li>To communicate with you about your account and updates</li>
                            <li>To improve and personalize user experience</li>
                            <li>To comply with legal obligations and industry regulations</li>
                            <li>To detect and prevent fraud or security incidents</li>
                        </ul>
                    </div>

                    <div className="mb-5">
                        <h5 className="d-flex align-items-center gap-2 mb-3">
                            <Eye size={20} className="text-primary" /> Sharing Your Information
                        </h5>
                        <p className="text-muted" style={{ lineHeight: 1.7 }}>
                            We do not sell, trade, or rent your personal information to third parties. We may share information with:
                        </p>
                        <ul className="text-muted" style={{ lineHeight: 1.7 }}>
                            <li>Healthcare providers for claims processing</li>
                            <li>Corporate clients for employee enrollment verification</li>
                            <li>Regulatory authorities when required by law</li>
                            <li>Service providers who assist in platform operations</li>
                        </ul>
                    </div>

                    <div className="mb-5">
                        <h5 className="d-flex align-items-center gap-2 mb-3">Data Security</h5>
                        <p className="text-muted" style={{ lineHeight: 1.7 }}>
                            We implement appropriate technical and organizational security measures to protect your data, including encryption, access controls, and regular security audits. However, no method of transmission over the Internet is 100% secure.
                        </p>
                    </div>

                    <div className="mb-5">
                        <h5 className="d-flex align-items-center gap-2 mb-3">Your Rights</h5>
                        <p className="text-muted" style={{ lineHeight: 1.7 }}>
                            Depending on your jurisdiction, you may have the right to:
                        </p>
                        <ul className="text-muted" style={{ lineHeight: 1.7 }}>
                            <li>Access the personal information we hold about you</li>
                            <li>Correct inaccurate or incomplete information</li>
                            <li>Request deletion of your personal information</li>
                            <li>Opt-out of certain data processing activities</li>
                            <li>Receive a copy of your data in a portable format</li>
                        </ul>
                    </div>

                    <div className="mb-4">
                        <h5 className="d-flex align-items-center gap-2 mb-3">
                            <Mail size={20} className="text-primary" /> Contact Us
                        </h5>
                        <p className="text-muted" style={{ lineHeight: 1.7 }}>
                            If you have questions or concerns about this Privacy Policy, please contact us at:
                        </p>
                        <div className="bg-light p-3 rounded">
                            <p className="mb-1"><strong>G8 Brooks Technologies</strong></p>
                            <p className="mb-1">Email: privacy@g8brooks.com</p>
                            <p className="mb-1">Phone: +234 (0) 123 456 7890</p>
                            <p className="mb-0">Address: 25 Technology Avenue, Victoria Island, Lagos, Nigeria</p>
                        </div>
                    </div>

                    <div className="text-muted small border-top pt-3 mt-3">
                        <p className="mb-0">© {new Date().getFullYear()} G8 Brooks. All rights reserved. This Privacy Policy is effective as of February 21, 2026.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
