from sqlalchemy.exc import IntegrityError


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


# Ye errors "expected" hain — `app/main.py` ke handlers inhe theek status code
# (404 / 409 / 422) aur standard envelope mein badal dete hain, aur khud hi
# munasib level par log karte hain.
#
# Endpoint ka `try/except` inhe chhoo kar aage bhej deta hai; sirf UNEXPECTED
# error par apna context log karta hai. Agar inhe bhi `log.exception()` karte
# to har duplicate SKU (jo aam baat hai) error-level alert bana deta.
HANDLED_ERRORS = (AppException, IntegrityError)
