from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.role import Role
from app.routers.auth import get_current_user
from app.schemas.role import RoleResponse

router = APIRouter(
    prefix="/roles",
    tags=["Роли"],
    dependencies=[Depends(get_current_user)]
)


@router.get(
    "",
    response_model=list[RoleResponse]
)
def get_roles(
    db: Session = Depends(get_db)
):
    return db.query(Role).order_by(Role.id).all()
