import React from 'react';

export default function StatCard({ title, value, icon, color = 'primary' }) {
    return (
        <div className={`card bg-${color} bg-opacity-10 border-${color}`}>
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 className="text-muted mb-2">{title}</h6>
                        <h3 className="mb-0">{value}</h3>
                    </div>
                    <div className={`bg-${color} text-white p-3 rounded-circle`}>
                        {icon}
                    </div>
                </div>
            </div>
        </div>
    );
}
