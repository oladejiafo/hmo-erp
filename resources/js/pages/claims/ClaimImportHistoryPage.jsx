import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Download, Eye } from "lucide-react";
import { fetchImportBatches } from "../../api/index";
import {
    PageHeader,
    LoadingSpinner,
    ErrorAlert,
    Pagination,
    StatusBadge,
} from "../../components/ui/index";
import { formatDateTime } from "../../utils/format";

const STATUS_STYLE = {
    pending: { color: "#b05e00", bg: "#fef7e0", label: "Pending" },
    mapped: { color: "#1967d2", bg: "#e8f0fe", label: "Mapped" },
    validated: { color: "#1967d2", bg: "#e8f0fe", label: "Validated" },
    completed: { color: "#137333", bg: "#e6f4ea", label: "Completed" },
    failed: { color: "#c5221f", bg: "#fce8e6", label: "Failed" },
};

export default function ClaimImportHistoryPage() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["import-batches", { page, status: statusFilter }],
        queryFn: () =>
            fetchImportBatches({ page, status: statusFilter || undefined }),
    });

    const batches = data?.data?.data ?? data?.data ?? [];
    const meta = data?.meta;

    if (error) return <ErrorAlert error={error} onRetry={refetch} />;

    return (
        <div>
            <PageHeader
                title="Claim Import History"
                subtitle="View all bulk claim uploads"
                actions={
                    <button
                        className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                        onClick={() => navigate("/claims/import")}
                    >
                        <ArrowLeft size={14} />
                        Back to Import
                    </button>
                }
            />

            {/* Filters */}
            <div className="card border-0 shadow-sm mb-3">
                <div className="card-body py-2">
                    <div className="d-flex gap-2 align-items-center flex-wrap">
                        <span
                            className="text-muted me-1"
                            style={{ fontSize: 12 }}
                        >
                            Status:
                        </span>
                        {[
                            "",
                            "pending",
                            "mapped",
                            "validated",
                            "completed",
                            "failed",
                        ].map((s) => (
                            <button
                                key={s}
                                className={`btn btn-sm rounded-pill ${
                                    statusFilter === s
                                        ? "btn-primary"
                                        : "btn-outline-secondary"
                                }`}
                                style={{ fontSize: 11 }}
                                onClick={() => {
                                    setStatusFilter(s);
                                    setPage(1);
                                }}
                            >
                                {s || "All"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="py-5 text-center">
                    <LoadingSpinner />
                </div>
            ) : batches.length === 0 ? (
                <div className="card border-0 shadow-sm">
                    <div className="card-body text-center py-5 text-muted">
                        <FileText size={48} className="mb-3 opacity-25" />
                        <h5>No import batches found</h5>
                        <p className="mb-3">Start by uploading a claims file</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate("/claims/import")}
                        >
                            New Import
                        </button>
                    </div>
                </div>
            ) : (
                <div className="card border-0 shadow-sm">
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="ps-3">Batch #</th>
                                        <th>HCP</th>
                                        <th>Period</th>
                                        <th>Uploaded</th>
                                        <th className="text-end">Total</th>
                                        <th className="text-end">Valid</th>
                                        <th className="text-end">Errors</th>
                                        <th>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {batches.map((b) => {
                                        const style =
                                            STATUS_STYLE[b.status] ||
                                            STATUS_STYLE.pending;
                                        return (
                                            <tr key={b.id}>
                                                <td className="ps-3 font-monospace">
                                                    {b.batch_number}
                                                </td>
                                                <td>{b.hcp?.name || "—"}</td>
                                                <td>{b.claim_period}</td>
                                                <td style={{ fontSize: 12 }}>
                                                    {formatDateTime(
                                                        b.created_at
                                                    )}
                                                    <br />
                                                    <small className="text-muted">
                                                        by {b.uploaded_by?.name}
                                                    </small>
                                                </td>
                                                <td className="text-end">
                                                    {b.total_rows}
                                                </td>
                                                <td className="text-end text-success">
                                                    {b.valid_rows}
                                                </td>
                                                <td className="text-end text-danger">
                                                    {b.error_rows}
                                                </td>
                                                <td>
                                                    <span
                                                        className="badge"
                                                        style={{
                                                            background:
                                                                style.bg,
                                                            color: style.color,
                                                            fontSize: 11,
                                                        }}
                                                    >
                                                        {style.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-sm btn-outline-primary py-0"
                                                        onClick={() =>
                                                            navigate(
                                                                `/claims/import/${b.id}`
                                                            )
                                                        }
                                                    >
                                                        <Eye size={14} /> View
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {meta && (
                        <div className="card-body border-top py-2">
                            <Pagination meta={meta} onPageChange={setPage} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
