from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from aegisrec.api.deps import get_current_site
from aegisrec.controllers import assistant_controller
from aegisrec.core.database import get_db
from aegisrec.models.site import Site
from aegisrec.schemas import AssistantChatRequest, AssistantChatResponse

router = APIRouter(tags=["assistant"])


@router.post("/assistant/chat", response_model=AssistantChatResponse)
def assistant_chat(
    body: AssistantChatRequest,
    site: Site = Depends(get_current_site),
    db: Session = Depends(get_db),
) -> Any:
    return assistant_controller.chat(db, site, body)
