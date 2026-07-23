"""Turn a Pydantic model into a FastAPI form dependency.

FastAPI validates JSON request bodies against Pydantic models automatically,
but ``multipart/form-data`` (the content type used when you also upload files)
is different — each field arrives via ``Form(...)``. This ``as_form`` decorator
lets you reuse the SAME Pydantic model (and all its validators) for form data.

Usage:

    @as_form
    class SignupForm(BaseModel):
        email: EmailStr
        password: str = Field(min_length=8)

    @router.post("/signup")
    async def signup(form: Annotated[SignupForm, Depends(SignupForm.as_form)]):
        ...   # `form` is a fully validated SignupForm instance

Validation failures raise the usual FastAPI 422 response, just like JSON bodies.
"""

import inspect
from typing import TypeVar

from fastapi import Form
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ValidationError

ModelT = TypeVar("ModelT", bound=BaseModel)


def as_form(cls: type[ModelT]) -> type[ModelT]:
    """Class decorator that adds an ``as_form`` classmethod to a Pydantic model."""
    parameters = []
    for name, field in cls.model_fields.items():
        default = ... if field.is_required() else field.default
        parameters.append(
            inspect.Parameter(
                name,
                inspect.Parameter.POSITIONAL_OR_KEYWORD,
                default=Form(default),
                annotation=field.annotation,
            )
        )

    def _as_form(**data):
        try:
            return cls(**data)
        except ValidationError as exc:
            # Surface as a normal 422 (same shape as JSON body validation).
            raise RequestValidationError(exc.errors()) from exc

    _as_form.__signature__ = inspect.Signature(parameters)
    cls.as_form = staticmethod(_as_form)  # type: ignore[attr-defined]
    return cls
