class AppException(Exception):
    """Base class for domain/business exceptions.

    Services raise these; the API layer maps them to HTTP responses
    (see app/main.py). This keeps services free of HTTP concerns.
    """

    status_code: int = 400
    detail: str = "Application error"

    def __init__(self, detail: str | None = None) -> None:
        if detail is not None:
            self.detail = detail
        super().__init__(self.detail)


class NotFoundError(AppException):
    status_code = 404
    detail = "Resource not found"


class ConflictError(AppException):
    status_code = 409
    detail = "Resource already exists"


class UnauthorizedError(AppException):
    status_code = 401
    detail = "Not authenticated"
