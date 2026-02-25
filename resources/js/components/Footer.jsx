import React from 'react';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer
            className="border-top bg-white px-4 d-flex align-items-center justify-content-between flex-shrink-0"
            style={{ height: 44, fontSize: 11, color: '#6c757d' }}
        >
            <span>
                © {year} HMO ERP System — All rights reserved.
            </span>

            <span className="d-flex align-items-center gap-1">
                Built with <Heart size={10} className="text-danger mx-1" fill="currentColor" /> by{' '}
                <a 
                    href="https://g8brooks.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-decoration-none fw-semibold"
                    style={{ color: '#1e3a5f' }}
                >
                    G8 Brooks
                </a>
                <span className="mx-1">·</span>
               
            </span>

            <span className="d-flex gap-3">
                <Link to="/privacy-policy" className="text-muted text-decoration-none" style={{ fontSize: 11 }}>
                    Privacy Policy
                </Link>
                <Link to="/terms" className="text-muted  text-decoration-none d-block" style={{ fontSize: 11 }}>
                    Terms & Conditions
                </Link>
                <Link to="/support" className="text-muted text-decoration-none" style={{ fontSize: 11 }}>
                    Support
                </Link>
            </span>
        </footer>
    );
}
