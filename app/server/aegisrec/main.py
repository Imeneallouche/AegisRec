import aegisrec.models  # noqa: F401 — register SQLAlchemy mappers before create_all

from fastapi import FastAPI

from aegisrec.api.routes import assistant, auth, site, system
from aegisrec.core.database import Base, engine
from aegisrec.middleware.cors import setup_cors
from aegisrec.seed.runner import run_seed


def create_app() -> FastAPI:
    application = FastAPI(title="AegisRec API", version="0.2.0")
    setup_cors(application)
    application.include_router(auth.router, prefix="/api")
    application.include_router(site.router, prefix="/api")
    application.include_router(assistant.router, prefix="/api")
    application.include_router(system.router)

    @application.on_event("startup")
    def _startup() -> None:
        Base.metadata.create_all(bind=engine)
        run_seed()

    return application


app = create_app()
