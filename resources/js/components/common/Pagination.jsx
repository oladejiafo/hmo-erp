import React from 'react';

export default function Pagination({ currentPage, lastPage, onPageChange }) {
    const pages = [];
    for (let i = 1; i <= lastPage; i++) {
        pages.push(i);
    }

    if (lastPage <= 1) return null;

    return (
        <nav aria-label="Page navigation">
            <ul className="pagination justify-content-center">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button 
                        className="page-link" 
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                </li>
                
                {pages.map(page => (
                    <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                        <button 
                            className="page-link" 
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </button>
                    </li>
                ))}
                
                <li className={`page-item ${currentPage === lastPage ? 'disabled' : ''}`}>
                    <button 
                        className="page-link" 
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === lastPage}
                    >
                        Next
                    </button>
                </li>
            </ul>
        </nav>
    );
}
