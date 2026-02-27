"""
src/engine/embedding_engine.py
────────────────────────────────
Stage 3 – Semantic similarity via Sentence-Transformer embeddings.

Handles "log drift": when log messages change wording but intent stays the
same the cosine similarity between the document embedding and the
DataComponent description embedding still fires.

Model
─────
Default: "all-MiniLM-L6-v2" (fast, good general quality)
Swap for a cybersecurity fine-tuned model, e.g.:
  • "jackaduma/SecRoBERTa"
  • "ehsanaghaei/SecureBERT"
  • Any SentenceTransformer-compatible HF model

Pre-computation
───────────────
All DataComponent description embeddings are pre-computed at startup
and cached in memory.  Only document embeddings are computed at runtime.

Performance notes
──────────────────
• Embeddings are batched (batch_size=32) to maximise GPU/CPU throughput.
• Results are cached per dc_id to avoid recomputation across docs.
• If a GPU is available torch will use it automatically.
"""
from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np
import structlog

from config.settings import settings
from src.loaders.dc_loader import DataComponentRegistry

log = structlog.get_logger(__name__)

# Lazy import – sentence_transformers is large
_ST_AVAILABLE = False
try:
    from sentence_transformers import SentenceTransformer  # type: ignore
    import torch  # type: ignore
    _ST_AVAILABLE = True
except ImportError:
    pass


@dataclass
class EmbeddingMatch:
    dc_id: str
    score: float            # cosine similarity 0..1
    description_snippet: str


class EmbeddingEngine:
    """
    Manages lifecycle of the embedding model and DC reference vectors.

    Usage
    ─────
    engine = EmbeddingEngine()
    engine.build(registry)                  # pre-compute DC embeddings
    matches = await engine.search(doc_text) # returns sorted list
    """

    def __init__(self, model_name: Optional[str] = None) -> None:
        self.model_name = model_name or settings.embedding_model
        self.threshold = settings.similarity_threshold
        self._model: Optional["SentenceTransformer"] = None
        self._dc_embeddings: Dict[str, np.ndarray] = {}
        self._dc_texts: Dict[str, str] = {}
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="embed")

    # ── Startup ───────────────────────────────────────────────────────────────

    def build(self, registry: DataComponentRegistry) -> None:
        if not _ST_AVAILABLE:
            log.warning(
                "embedding_engine.unavailable",
                reason="sentence-transformers / torch not installed; Stage-3 disabled",
            )
            return

        log.info("embedding_engine.loading_model", model=self.model_name)
        self._model = SentenceTransformer(self.model_name)  # type: ignore

        # Build canonical text per DataComponent
        dc_texts: Dict[str, str] = {}
        for dc in registry.all:
            # Rich context string – description + keywords + field names
            text_parts = [
                dc.description,
                "Keywords: " + ", ".join(dc.keywords),
                "Fields: " + ", ".join(dc.fields),
                "Categories: " + ", ".join(dc.categories),
            ]
            # Add log-source hints
            ls_snippets = [
                f"{ls.name}: {ls.channel}" for ls in dc.log_sources[:10]
            ]
            text_parts.append("LogSources: " + "; ".join(ls_snippets))
            dc_texts[dc.id] = " ".join(text_parts)

        # Batch-encode all DC descriptions
        ids = list(dc_texts.keys())
        texts = [dc_texts[i] for i in ids]
        log.info(
            "embedding_engine.pre_computing",
            count=len(texts),
            model=self.model_name,
        )
        embeddings = self._model.encode(  # type: ignore[union-attr]
            texts,
            batch_size=32,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        for dc_id, emb in zip(ids, embeddings):
            self._dc_embeddings[dc_id] = emb
            self._dc_texts[dc_id] = dc_texts[dc_id]

        log.info(
            "embedding_engine.ready",
            dc_count=len(self._dc_embeddings),
        )

    # ── Inference ─────────────────────────────────────────────────────────────

    def _encode_sync(self, text: str) -> np.ndarray:
        """Synchronous encode – call from executor."""
        return self._model.encode(  # type: ignore[union-attr]
            [text], normalize_embeddings=True
        )[0]

    async def search(
        self,
        doc_text: str,
        candidate_dc_ids: Optional[List[str]] = None,
    ) -> List[EmbeddingMatch]:
        """
        Compute cosine similarity between `doc_text` and DC description vectors.

        Parameters
        ──────────
        doc_text           : flattened log document text
        candidate_dc_ids   : if provided, only score these DCs (Stage-3 triage)
                             Pass None to score all DCs (slower, more thorough).

        Returns
        ───────
        Sorted list of EmbeddingMatch (highest score first) above threshold.
        """
        if not self.ready:
            return []

        loop = asyncio.get_event_loop()
        doc_emb: np.ndarray = await loop.run_in_executor(
            self._executor, self._encode_sync, doc_text
        )

        ids = candidate_dc_ids or list(self._dc_embeddings.keys())
        results: List[EmbeddingMatch] = []

        for dc_id in ids:
            ref_emb = self._dc_embeddings.get(dc_id)
            if ref_emb is None:
                continue
            score = float(np.dot(doc_emb, ref_emb))   # both normalised → cosine
            if score >= self.threshold:
                snippet = self._dc_texts[dc_id][:120] + "…"
                results.append(
                    EmbeddingMatch(dc_id=dc_id, score=score, description_snippet=snippet)
                )

        results.sort(key=lambda x: x.score, reverse=True)
        return results

    @property
    def ready(self) -> bool:
        return self._model is not None and bool(self._dc_embeddings)
