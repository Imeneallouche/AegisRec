from fastapi import APIRouter

router = APIRouter(tags=["system"])


@router.get("/")
def root() -> dict:
    return {"service": "aegisrec-api", "docs": "/docs"}


@router.get("/health")
def health_not_learning_service() -> dict:
    """Liveness for this process — not the MITRE learning /health (different port)."""
    return {
        "service": "aegisrec-api",
        "message": (
            "This is the AegisRec site API. Point the UI engine URL at the MITRE "
            "learning service (python -m learning.cli serve; default port 8090 in config/learning.yml)."
        ),
    }
