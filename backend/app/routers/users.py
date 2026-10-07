from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.auth import get_current_user, require_roles, require_staff
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.user_service import UserService

router = APIRouter(
    prefix="/users",
    tags=["Пользователи"],
    dependencies=[Depends(get_current_user), Depends(require_staff)]
)

service = UserService()


@router.get(
    "/",
    response_model=list[UserResponse]
)
def get_users(
    db: Session = Depends(get_db)
):
    return service.get_all(db)


@router.get(
    "/{user_id}",
    response_model=UserResponse
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db)
):

    user = service.get_by_id(
        db,
        user_id
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Пользователь не найден"
        )

    return user


@router.post(
    "/",
    response_model=UserResponse,
    status_code=201,
    dependencies=[Depends(require_roles("Администратор"))]
)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db)
):
    return service.create(
        db,
        data
    )


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    dependencies=[Depends(require_roles("Администратор"))]
)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db)
):
    return service.update(
        db,
        user_id,
        data
    )


@router.delete(
    "/{user_id}",
    status_code=204,
    dependencies=[Depends(require_roles("Администратор"))]
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db)
):

    user = service.get_by_id(
        db,
        user_id
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Пользователь не найден"
        )

    service.delete(
        db,
        user
    )
