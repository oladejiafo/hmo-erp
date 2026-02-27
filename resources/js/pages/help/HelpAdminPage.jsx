import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus,
    Edit,
    Trash2,
    Eye,
    EyeOff,
    Search,
    ArrowLeft,
    Star,
    StarOff,
} from "lucide-react";
import apiClient from "../../api/client";
import {
    PageHeader,
    LoadingSpinner,
    ErrorAlert,
    ConfirmModal,
} from "../../components/ui/index";
import { toast } from "react-toastify";

export default function HelpAdminPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ["help-admin", search],
        queryFn: () =>
            apiClient.get("/help/admin/list", {
                params: { q: search || undefined },
            }),
    });

    // Log to see the structure
    console.log("Admin API response:", data);

    const deleteMutation = useMutation({
        mutationFn: (id) => apiClient.delete(`/help/admin/articles/${id}`),
        onSuccess: () => {
            toast.success("Article deleted");
            queryClient.invalidateQueries(["help-admin"]);
            setDeleteTarget(null);
        },
        onError: (err) =>
            toast.error(err.response?.data?.message || "Delete failed"),
    });

    // Try different extraction patterns
    const articles = data?.data?.data ?? data?.data ?? [];
    console.log("Extracted articles:", articles);
    if (error) return <ErrorAlert error={error} />;

    return (
        <div>
            <PageHeader
                title="Manage Help Articles"
                subtitle="Create, edit, and organize help content"
                actions={
                    <button
                        className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                        onClick={() => navigate("/help/admin/new")}
                    >
                        <Plus size={15} /> New Article
                    </button>
                }
            />

            <div className="d-flex align-items-center gap-3 mb-4">
                <button
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                    onClick={() => navigate("/help")}
                >
                    <ArrowLeft size={14} /> Back to Help Centre
                </button>
                <div className="input-group" style={{ maxWidth: 300 }}>
                    <span className="input-group-text bg-white">
                        <Search size={14} />
                    </span>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search articles..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <LoadingSpinner />
            ) : (
                <div className="card border-0 shadow-sm">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Title</th>
                                    <th>Category</th>
                                    <th>Status</th>
                                    <th>Featured</th>
                                    <th>Views</th>
                                    <th>Helpful</th>
                                    <th>Last Updated</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {articles.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="text-center py-4 text-muted"
                                        >
                                            No articles found
                                        </td>
                                    </tr>
                                ) : (
                                    articles.map((article) => (
                                        <tr key={article.id}>
                                            <td>
                                                <div className="fw-semibold">
                                                    {article.title}
                                                </div>
                                                <small className="text-muted">
                                                    {article.slug}
                                                </small>
                                            </td>
                                            <td>
                                                <span className="badge bg-light text-dark">
                                                    {article.category_icon}{" "}
                                                    {article.category_label}
                                                </span>
                                            </td>
                                            <td>
                                                {article.is_published ? (
                                                    <span className="badge bg-success-subtle text-success">
                                                        <Eye
                                                            size={12}
                                                            className="me-1"
                                                        />{" "}
                                                        Published
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-secondary-subtle text-secondary">
                                                        <EyeOff
                                                            size={12}
                                                            className="me-1"
                                                        />{" "}
                                                        Draft
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                {article.is_featured ? (
                                                    <Star
                                                        size={16}
                                                        className="text-warning"
                                                    />
                                                ) : (
                                                    <StarOff
                                                        size={16}
                                                        className="text-muted"
                                                    />
                                                )}
                                            </td>
                                            <td>{article.view_count}</td>
                                            <td>
                                                {article.helpful_count} /{" "}
                                                {article.not_helpful_count}
                                            </td>
                                            <td>
                                                {new Date(
                                                    article.updated_at
                                                ).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-outline-primary me-1"
                                                    onClick={() =>
                                                        navigate(
                                                            `/help/admin/edit/${article.id}`
                                                        )
                                                    }
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() =>
                                                        setDeleteTarget(article)
                                                    }
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ConfirmModal
                show={!!deleteTarget}
                title="Delete Article"
                message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
                onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
                onCancel={() => setDeleteTarget(null)}
                loading={deleteMutation.isPending}
            />
        </div>
    );
}
