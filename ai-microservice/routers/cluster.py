"""
routers/cluster.py
───────────────────
POST /fraud-cluster

Runs unsupervised clustering on recent fraud flags to surface patterns
that may not be obvious from the per-HCP fraud heatmap.

Pipeline:
  1. Receive fraud_flags array (from Laravel - last 3 months, up to 1000 rows)
  2. Encode features: flag_score, flag_type (ordinal), amount, time-of-day
  3. Normalise with StandardScaler
  4. Run DBSCAN (density-based - good for irregular shapes, auto-detects outliers)
  5. For each cluster, ask Claude to generate a human-readable label + description
  6. Return clusters with member IDs, risk scores, and descriptions

DBSCAN chosen over K-means because:
  - Number of clusters is unknown
  - Fraud patterns often form irregular dense regions
  - Noise points (-1 cluster) are meaningful (isolated unusual claims)
"""

import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

# from routers._client import call_claude
from routers._client import call_ai

logger = logging.getLogger("ai-microservice.cluster")
router = APIRouter()

FLAG_TYPE_MAP = {
    "duplicate_claim":        1,
    "tariff_mismatch":        2,
    "expired_plan":           3,
    "over_benefit_limit":     4,
    "frequency_anomaly":      5,
    "cost_spike":             6,
    "pattern_deviation":      7,
    "provider_blacklisted":   8,
    "invalid_diagnosis_code": 9,
    "pre_auth_missing":       10,
}


class FraudFlagRow(BaseModel):
    id:                   int
    flag_type:            str
    flag_score:           float
    hcp_id:               Optional[int]     = None
    enrollee_id:          Optional[int]     = None
    total_amount_claimed: Optional[float]   = None
    created_at:           Optional[str]     = None


class ClusterRequest(BaseModel):
    flags:  list
    run_at: Optional[str] = None


class FraudCluster(BaseModel):
    cluster_id:  int
    label:       str
    hcp_ids:     list
    enrollee_ids:list
    flag_types:  list
    risk_score:  float
    flag_count:  int
    description: str
    is_noise:    bool   # DBSCAN noise points (cluster_id = -1)


class ClusterResponse(BaseModel):
    clusters:     list
    total_flags:  int
    noise_count:  int
    run_at:       Optional[str]


@router.post("/fraud-cluster", response_model=ClusterResponse)
async def fraud_cluster(req: ClusterRequest):
    """
    Cluster fraud flags and generate human-readable pattern descriptions.
    """
    flags = req.flags

    if not flags:
        return ClusterResponse(
            clusters=[],
            total_flags=0,
            noise_count=0,
            run_at=req.run_at,
        )

    # ── Try scikit-learn clustering ───────────────────────────────────────────
    try:
        import numpy as np
        from sklearn.preprocessing import StandardScaler
        from sklearn.cluster import DBSCAN
        from datetime import datetime

        # Build feature matrix
        X = []
        valid_flags = []

        for row in flags:
            if isinstance(row, dict):
                f = row
            else:
                try:
                    f = dict(row)
                except Exception:
                    continue

            score   = float(f.get("flag_score", 50))
            ftype   = FLAG_TYPE_MAP.get(f.get("flag_type", ""), 0)
            amount  = float(f.get("total_amount_claimed") or 0) / 100_000  # scale to ~₦100k units
            # Extract hour from created_at for time-based patterns
            hour = 12
            if f.get("created_at"):
                try:
                    dt   = datetime.fromisoformat(str(f["created_at"]).replace("Z", "+00:00"))
                    hour = dt.hour
                except Exception:
                    pass

            X.append([score, ftype, amount, hour])
            valid_flags.append(f)

        if not X:
            raise ValueError("No valid feature rows")

        X_arr    = np.array(X, dtype=float)
        scaler   = StandardScaler()
        X_scaled = scaler.fit_transform(X_arr)

        # DBSCAN: eps=0.8, min_samples=3 (tune based on data volume)
        db     = DBSCAN(eps=0.8, min_samples=3, metric="euclidean").fit(X_scaled)
        labels = db.labels_

        # Group flags by cluster
        cluster_map = {}
        for i, label in enumerate(labels):
            if label not in cluster_map:
                cluster_map[label] = []
            cluster_map[label].append(valid_flags[i])

        # Build cluster summaries (AI-labelled)
        clusters = []
        for cluster_id, members in sorted(cluster_map.items()):
            hcp_ids      = list({m.get("hcp_id") for m in members if m.get("hcp_id")})
            enrollee_ids = list({m.get("enrollee_id") for m in members if m.get("enrollee_id")})
            flag_types   = list({m.get("flag_type") for m in members if m.get("flag_type")})
            avg_score    = sum(float(m.get("flag_score", 50)) for m in members) / len(members)
            is_noise     = cluster_id == -1

            # Ask Claude to describe the pattern
            label, description = await _describe_cluster(cluster_id, members, flag_types, avg_score, is_noise)

            clusters.append({
                "cluster_id":   cluster_id,
                "label":        label,
                "hcp_ids":      hcp_ids[:20],
                "enrollee_ids": enrollee_ids[:20],
                "flag_types":   flag_types,
                "risk_score":   round(avg_score, 1),
                "flag_count":   len(members),
                "description":  description,
                "is_noise":     is_noise,
            })

        noise_count = len(cluster_map.get(-1, []))

        return ClusterResponse(
            clusters=clusters,
            total_flags=len(valid_flags),
            noise_count=noise_count,
            run_at=req.run_at,
        )

    except ImportError:
        logger.warning("scikit-learn not installed - returning simple group-by-flag-type clusters")
        return _simple_cluster_fallback(flags, req.run_at)

    except Exception as e:
        logger.error(f"Clustering error: {e}", exc_info=True)
        return _simple_cluster_fallback(flags, req.run_at)


async def _describe_cluster(
    cluster_id: int,
    members: list,
    flag_types: list,
    avg_score: float,
    is_noise: bool,
) -> tuple[str, str]:
    """Ask Claude to label and describe a fraud cluster."""
    if is_noise:
        return "Isolated Anomalies", f"{len(members)} isolated fraud flags that don't fit any pattern - review individually."

    prompt = f"""
You are a fraud analyst for a Nigerian HMO.

Describe this cluster of {len(members)} fraud flags in 1 short label (3-5 words) and 1-2 sentence description.

Flag types present:  {', '.join(flag_types)}
Average risk score:  {avg_score:.1f}/100
Number of HCPs:      {len({m.get('hcp_id') for m in members})}
Number of enrollees: {len({m.get('enrollee_id') for m in members})}

Return JSON: {{ "label": "...", "description": "..." }}
"""
    result = await call_ai(
        system="You are a concise fraud analyst. Return only valid JSON.",
        user_message=prompt,
        max_tokens=128,
        expect_json=True,
    )

    if result:
        return result.get("label", f"Cluster {cluster_id}"), result.get("description", "")

    # Fallback labels
    primary_type = flag_types[0] if flag_types else "unknown"
    label        = primary_type.replace("_", " ").title()
    description  = f"Cluster of {len(members)} flags dominated by {primary_type.replace('_', ' ')} with avg risk {avg_score:.0f}/100."
    return label, description


def _simple_cluster_fallback(flags: list, run_at: str | None) -> ClusterResponse:
    """
    Fallback when scikit-learn is unavailable:
    Group by flag_type and treat each type as a cluster.
    """
    groups: dict = {}
    for flag in flags:
        ft = flag.get("flag_type") or "unknown" if isinstance(flag, dict) else "unknown"
        if ft not in groups:
            groups[ft] = []
        groups[ft].append(flag)

    clusters = []
    for i, (ft, members) in enumerate(groups.items()):
        avg_score = sum(float(m.get("flag_score", 50)) for m in members) / len(members)
        clusters.append({
            "cluster_id":   i,
            "label":        ft.replace("_", " ").title(),
            "hcp_ids":      list({m.get("hcp_id") for m in members if m.get("hcp_id")})[:20],
            "enrollee_ids": list({m.get("enrollee_id") for m in members if m.get("enrollee_id")})[:20],
            "flag_types":   [ft],
            "risk_score":   round(avg_score, 1),
            "flag_count":   len(members),
            "description":  f"Group of {len(members)} flags of type {ft.replace('_', ' ')}.",
            "is_noise":     False,
        })

    return ClusterResponse(
        clusters=clusters,
        total_flags=len(flags),
        noise_count=0,
        run_at=run_at,
    )