from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.adapters.inbound.api.dependencies import (
    get_list_admin_properties_use_case,
    require_admin_role,
)
from app.application.use_cases.list_admin_properties import ListAdminPropertiesUseCase

router = APIRouter()


class AdminPropertyOut(BaseModel):
    id: UUID
    name: str


@router.get("/admin/properties", response_model=list[AdminPropertyOut], dependencies=[Depends(require_admin_role)])
async def list_admin_properties(
    limit: int = Query(500, ge=1, le=5000),
    use_case: ListAdminPropertiesUseCase = Depends(get_list_admin_properties_use_case),
):
    return await use_case.execute(limit=limit)

