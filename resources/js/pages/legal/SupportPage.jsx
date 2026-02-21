import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    ArrowLeft, HelpCircle, Mail, Phone, MessageCircle, 
    Book, FileText, ChevronDown, ChevronUp, Send 
} from 'lucide-react';
import { PageHeader } from '../../components/ui';

export default function SupportPage() {
    const [openFaq, setOpenFaq] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [submitted, setSubmitted] = useState(false);

    const toggleFaq = (index) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // In a real app, you'd send this to your backend
        console.log('Support form submitted:', formData);
        setSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => setSubmitted(false), 5000);
    };

    const faqs = [
        {
            question: 'How do I reset my password?',
            answer: 'Go to the login page and click "Forgot Password". Enter your email address and you will receive a password reset link. Follow the instructions in the email to create a new password.'
        },
        {
            question: 'How do I add a new enrollee?',
            answer: 'Navigate to Enrollees from the sidebar, then click the "New Enrollee" button. Fill in the required information including personal details, corporate affiliation, and plan selection. Click "Save" to complete the process.'
        },
        {
            question: 'How are claims processed?',
            answer: 'Claims go through an automated validation process upon submission. They are checked for duplicates, tariff compliance, and risk scoring. Claims that pass auto-validation move to "validated" status. High-risk claims are flagged for review by claims officers.'
        },
        {
            question: 'What do I do if a claim is rejected?',
            answer: 'Rejected claims will include a rejection reason. You can view the details by clicking on the claim. To resubmit, you\'ll need to correct the issues noted and submit a new claim referencing the original.'
        },
        {
            question: 'How do I generate reports?',
            answer: 'Go to the Reports section from the sidebar. You can access various pre-built reports including Claims Aging, Claims by HCP, Cost by Corporate, and more. Use the date filters to narrow down the data and click "Export" to download.'
        },
        {
            question: 'How do I add a new HCP to the system?',
            answer: 'Navigate to HCPs, click "New HCP". Complete the registration form with provider details, contact information, and accreditation numbers. Once submitted, the HCP will require accreditation by an authorized user before they can start receiving claims.'
        },
        {
            question: 'What is two-factor authentication and how do I enable it?',
            answer: 'Two-factor authentication adds an extra layer of security to your account. Go to your Profile settings, click "Enable 2FA", scan the QR code with an authenticator app like Google Authenticator, and enter the verification code to confirm.'
        }
    ];

    return (
        <div className="container py-4">
            <div className="mb-4">
                <Link to="/" className="btn btn-outline-secondary btn-sm">
                    <ArrowLeft size={16} className="me-1" /> Back to Dashboard
                </Link>
            </div>

            <div className="row">
                <div className="col-lg-8 mx-auto">
                    <div className="text-center mb-5">
                        <HelpCircle size={48} className="text-primary mb-3" />
                        <h2 className="fw-bold">How can we help you?</h2>
                        <p className="text-muted">Find answers to common questions or reach out to our support team</p>
                    </div>

                    {/* Quick Contact Cards */}
                    <div className="row g-4 mb-5">
                        <div className="col-md-4">
                            <div className="card h-100 text-center border-0 shadow-sm">
                                <div className="card-body">
                                    <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
                                        <Mail className="text-primary" size={24} />
                                    </div>
                                    <h6 className="fw-bold">Email Support</h6>
                                    <p className="small text-muted mb-2">Get a response within 24 hours</p>
                                    <a href="mailto:support@g8brooks.com" className="text-decoration-none">support@g8brooks.com</a>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card h-100 text-center border-0 shadow-sm">
                                <div className="card-body">
                                    <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
                                        <Phone className="text-success" size={24} />
                                    </div>
                                    <h6 className="fw-bold">Phone Support</h6>
                                    <p className="small text-muted mb-2">Mon-Fri, 8am-6pm WAT</p>
                                    <a href="tel:+2341234567890" className="text-decoration-none">+234 (0) 123 456 7890</a>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card h-100 text-center border-0 shadow-sm">
                                <div className="card-body">
                                    <div className="bg-info bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
                                        <MessageCircle className="text-info" size={24} />
                                    </div>
                                    <h6 className="fw-bold">Live Chat</h6>
                                    <p className="small text-muted mb-2">Instant answers during business hours</p>
                                    <button className="btn btn-link text-decoration-none p-0">Start Chat</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* FAQ Section */}
                    <div className="card shadow-sm mb-5">
                        <div className="card-header bg-white py-3">
                            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                                <Book size={18} className="text-primary" /> Frequently Asked Questions
                            </h5>
                        </div>
                        <div className="card-body p-0">
                            <div className="accordion" id="faqAccordion">
                                {faqs.map((faq, index) => (
                                    <div key={index} className="border-bottom">
                                        <button
                                            className="d-flex justify-content-between align-items-center w-100 p-3 bg-transparent border-0 text-start"
                                            onClick={() => toggleFaq(index)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <span className="fw-medium">{faq.question}</span>
                                            {openFaq === index ? 
                                                <ChevronUp size={18} className="text-muted" /> : 
                                                <ChevronDown size={18} className="text-muted" />
                                            }
                                        </button>
                                        {openFaq === index && (
                                            <div className="px-3 pb-3 text-muted" style={{ fontSize: 14 }}>
                                                {faq.answer}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="card shadow-sm">
                        <div className="card-header bg-white py-3">
                            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                                <Send size={18} className="text-primary" /> Send us a message
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            {submitted && (
                                <div className="alert alert-success alert-dismissible fade show" role="alert">
                                    Thank you for contacting us! We'll get back to you shortly.
                                    <button type="button" className="btn-close" onClick={() => setSubmitted(false)}></button>
                                </div>
                            )}
                            <form onSubmit={handleSubmit}>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label small fw-medium">Full Name</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small fw-medium">Email Address</label>
                                        <input
                                            type="email"
                                            className="form-control form-control-sm"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label small fw-medium">Subject</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label small fw-medium">Message</label>
                                        <textarea
                                            className="form-control form-control-sm"
                                            rows="4"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            required
                                        ></textarea>
                                    </div>
                                    <div className="col-12">
                                        <button type="submit" className="btn btn-primary">
                                            Send Message
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Documentation Link */}
                    <div className="text-center mt-4">
                        <FileText size={16} className="text-muted me-1" />
                        <a href="#" className="text-muted text-decoration-none small">
                            View full documentation and user guides
                        </a>
                    </div>

                    <div className="text-center mt-3 small text-muted">
                        <p className="mb-0">© {new Date().getFullYear()} G8 Brooks. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
