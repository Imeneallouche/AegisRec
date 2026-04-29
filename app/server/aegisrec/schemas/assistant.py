from typing import Any

from pydantic import BaseModel, Field


class AssistantChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12000)


class AssistantChatResponse(BaseModel):
    reply: str
    context_summary: dict[str, Any] = Field(default_factory=dict)
