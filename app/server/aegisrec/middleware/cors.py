from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from aegisrec.config.settings import get_settings


def setup_cors(app: FastAPI) -> None:
    s = get_settings()
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=s.cors_allow_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
