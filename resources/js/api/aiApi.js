/**
 * FILE: resources/js/api/aiApi.js
 *
 * AI microservice calls — all routed through Laravel (/api/v1/ai/*)
 * which forwards to the Python FastAPI service with the X-AI-Key secret.
 *
 * Uses the shared axios client (resources/js/api/client.js) which
 * automatically attaches the Bearer token on every request.
 */

import apiClient from './client';

const aiApi = {

    classifyDocument: (documentText) =>
        apiClient.post('/ai/classify-document', { document_text: documentText })
            .then(res => res.data),

    smartRoute: (claimId) =>
        apiClient.post('/ai/smart-route', { claim_id: claimId })
            .then(res => res.data),

    ocrDocument: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post('/ai/ocr-document', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).then(res => res.data);
    },

    fraudClusters: () =>
        apiClient.get('/ai/fraud-clusters')
            .then(res => res.data),

    summarizeReport: (reportType, reportData) =>
        apiClient.post('/ai/summarize-report', {
            report_type: reportType,
            report_data: reportData,
        }).then(res => res.data),

    chat: (messages, persona = 'staff') =>
        apiClient.post('/ai/chat', { messages, persona })
            .then(res => res.data),

};

export default aiApi;