from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class SitePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    site_name: str
    location: Optional[str] = None
    industry_sector: Optional[str] = None
    description: Optional[str] = None
    ics_architecture: Optional[str] = None
    normalization_date: Optional[str] = None
    standard_version: Optional[str] = None


class MitigationAppliedPatch(BaseModel):
    applied: bool
