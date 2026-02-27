import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import apiClient from "../../api/client";
import {
    PageHeader,
    LoadingSpinner,
    FormField,
} from "../../components/ui/index";
import { toast } from "react-toastify";

const CATEGORIES = [
    { value: "getting_started", label: "Getting Started", icon: "🚀" },
    { value: "enrollees", label: "Enrollees & Members", icon: "👥" },
    { value: "claims", label: "Claims Management", icon: "📋" },
    { value: "pre_auth", label: "Pre-Authorisation", icon: "🔐" },
    { value: "plans", label: "Health Plans", icon: "🛡️" },
    { value: "reports", label: "Reports & Compliance", icon: "📊" },
    { value: "finance", label: "Finance & Payments", icon: "💰" },
    { value: "hcps", label: "Healthcare Providers", icon: "🏥" },
    { value: "administration", label: "System Administration", icon: "⚙️" },
    { value: "self_service", label: "Member Self-Service", icon: "📱" },
];

const ROLES = [
    "super_admin",
    "hq_admin",
    "hq_manager",
    "branch_manager",
    "claims_officer",
    "corporate_admin",
    "enrollee",
];

export default function HelpAdminEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [formData, setFormData] = useState({
        title: "",
        category: "getting_started",
        content: "",
        visible_to_roles: [],
        related_pages: [],
        is_published: true,
        is_featured: false,
        sort_order: 0,
    });

    const { data, isLoading } = useQuery({
        queryKey: ["help-article-edit", id],
        queryFn: () => apiClient.get(`/help/admin/articles/${id}`),
        enabled: isEditing,
    });

    useEffect(() => {
        if (data) {
            // const article = data?.data?.data;
            const article = data?.data?.data ?? data?.data ?? [];
            setFormData({
                title: article.title || "",
                category: article.category || "getting_started",
                content: article.content || "",
                visible_to_roles: article.visible_to_roles || [],
                related_pages: article.related_pages || [],
                is_published: article.is_published ?? true,
                is_featured: article.is_featured ?? false,
                sort_order: article.sort_order || 0,
            });
        }
    }, [data]);

    const mutation = useMutation({
        mutationFn: (data) =>
            isEditing
                ? apiClient.put(`/help/admin/articles/${id}`, data)
                : apiClient.post("/help/admin/articles", data),
        onSuccess: () => {
            toast.success(isEditing ? "Article updated" : "Article created");
            navigate("/help/admin");
        },
        onError: (err) =>
            toast.error(err.response?.data?.message || "Save failed"),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleRoleToggle = (role) => {
        setFormData((prev) => ({
            ...prev,
            visible_to_roles: prev.visible_to_roles.includes(role)
                ? prev.visible_to_roles.filter((r) => r !== role)
                : [...prev.visible_to_roles, role],
        }));
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div>
            <PageHeader
                title={isEditing ? "Edit Article" : "New Article"}
                actions={
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => navigate("/help/admin")}
                    >
                        <ArrowLeft size={18} className="me-1" /> Back
                    </button>
                }
            />

            <div className="card">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="row">
                            <div className="col-md-8">
                                <FormField label="Title" required>
                                    <input
                                        type="text"
                                        name="title"
                                        className="form-control"
                                        value={formData.title}
                                        onChange={handleChange}
                                        required
                                    />
                                </FormField>

                                <FormField label="Content" required>
                                    <textarea
                                        name="content"
                                        className="form-control"
                                        rows={15}
                                        value={formData.content}
                                        onChange={handleChange}
                                        required
                                        style={{ fontFamily: "monospace" }}
                                    />
                                </FormField>
                            </div>

                            <div className="col-md-4">
                                <div className="card mb-3">
                                    <div className="card-header">Settings</div>
                                    <div className="card-body">
                                        <FormField label="Category">
                                            <select
                                                name="category"
                                                className="form-select"
                                                value={formData.category}
                                                onChange={handleChange}
                                            >
                                                {CATEGORIES.map((c) => (
                                                    <option
                                                        key={c.value}
                                                        value={c.value}
                                                    >
                                                        {c.icon} {c.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </FormField>

                                        <FormField label="Sort Order">
                                            <input
                                                type="number"
                                                name="sort_order"
                                                className="form-control"
                                                value={formData.sort_order}
                                                onChange={handleChange}
                                            />
                                        </FormField>

                                        <div className="form-check mb-2">
                                            <input
                                                type="checkbox"
                                                name="is_published"
                                                className="form-check-input"
                                                id="is_published"
                                                checked={formData.is_published}
                                                onChange={handleChange}
                                            />
                                            <label
                                                className="form-check-label"
                                                htmlFor="is_published"
                                            >
                                                Published
                                            </label>
                                        </div>

                                        <div className="form-check mb-3">
                                            <input
                                                type="checkbox"
                                                name="is_featured"
                                                className="form-check-input"
                                                id="is_featured"
                                                checked={formData.is_featured}
                                                onChange={handleChange}
                                            />
                                            <label
                                                className="form-check-label"
                                                htmlFor="is_featured"
                                            >
                                                Featured (Start Here)
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="card">
                                    <div className="card-header">
                                        Visible to Roles
                                    </div>
                                    <div className="card-body">
                                        <p className="text-muted small mb-3">
                                            Leave empty to show to all users
                                        </p>
                                        {ROLES.map((role) => (
                                            <div
                                                key={role}
                                                className="form-check"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    id={`role_${role}`}
                                                    checked={formData.visible_to_roles.includes(
                                                        role
                                                    )}
                                                    onChange={() =>
                                                        handleRoleToggle(role)
                                                    }
                                                />
                                                <label
                                                    className="form-check-label"
                                                    htmlFor={`role_${role}`}
                                                >
                                                    {role.replace("_", " ")}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr />
                        <div className="d-flex justify-content-end gap-2">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => navigate("/help/admin")}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={mutation.isPending}
                            >
                                <Save size={18} className="me-1" />
                                {mutation.isPending
                                    ? "Saving..."
                                    : "Save Article"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
