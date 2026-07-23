"""Reusable file / image upload helpers.

These are framework-agnostic building blocks used by endpoints and services.
Call them wherever you need to persist an uploaded file — you don't repeat the
validate → rename → save logic in every endpoint.

Example (inside an endpoint):

    from fastapi import UploadFile
    from app.utils.files import save_image

    url = await save_image(file, subdir="avatars")   # -> "/static/avatars/ab12.png"
"""

import uuid
from pathlib import Path

import aiofiles
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import AppException

# Allowed image MIME types -> canonical file extension.
IMAGE_CONTENT_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

_CHUNK_SIZE = 1024 * 1024  # read/write in 1 MB chunks


class FileValidationError(AppException):
    status_code = 422
    detail = "Invalid file upload"


def _unique_filename(extension: str) -> str:
    """Generate a collision-free filename, keeping the extension."""
    return f"{uuid.uuid4().hex}{extension}"


def _target_dir(subdir: str) -> Path:
    base = Path(settings.UPLOAD_DIR) / subdir.strip("/")
    base.mkdir(parents=True, exist_ok=True)
    return base


def _public_url(relative_path: Path) -> str:
    """Map a saved file path to its public URL (served via StaticFiles)."""
    rel = relative_path.relative_to(settings.UPLOAD_DIR).as_posix()
    return f"{settings.STATIC_URL_PREFIX.rstrip('/')}/{rel}"


async def save_upload(
    file: UploadFile,
    *,
    subdir: str = "",
    allowed_types: dict[str, str] | None = None,
    max_size: int | None = None,
) -> str:
    """Validate and save an uploaded file to disk.

    Args:
        file: the FastAPI ``UploadFile``.
        subdir: folder under ``UPLOAD_DIR`` to store the file in.
        allowed_types: mapping of accepted content-type -> extension.
            ``None`` accepts any type (extension taken from the original name).
        max_size: max bytes allowed. Defaults to ``settings.MAX_UPLOAD_SIZE``.

    Returns:
        The public URL of the saved file (e.g. ``/static/avatars/ab12.png``).

    Raises:
        FileValidationError: on disallowed type or oversized file.
    """
    max_size = max_size or settings.MAX_UPLOAD_SIZE

    # Resolve the extension from the declared content type (preferred) or name.
    if allowed_types is not None:
        if file.content_type not in allowed_types:
            allowed = ", ".join(sorted(allowed_types))
            raise FileValidationError(
                f"Unsupported file type '{file.content_type}'. Allowed: {allowed}"
            )
        extension = allowed_types[file.content_type]
    else:
        extension = Path(file.filename or "").suffix or ""

    filename = _unique_filename(extension)
    destination = _target_dir(subdir) / filename

    # Stream to disk in chunks while enforcing the size limit.
    size = 0
    try:
        async with aiofiles.open(destination, "wb") as out:
            while chunk := await file.read(_CHUNK_SIZE):
                size += len(chunk)
                if size > max_size:
                    await out.close()
                    destination.unlink(missing_ok=True)
                    raise FileValidationError(
                        f"File too large. Max size is {max_size // (1024 * 1024)} MB"
                    )
                await out.write(chunk)
    finally:
        await file.close()

    return _public_url(destination)


async def save_image(file: UploadFile, *, subdir: str = "images") -> str:
    """Convenience wrapper that only accepts image files."""
    return await save_upload(file, subdir=subdir, allowed_types=IMAGE_CONTENT_TYPES)


def delete_file(public_url: str) -> bool:
    """Delete a previously saved file given its public URL.

    Returns True if a file was removed, False if it didn't exist.
    """
    prefix = settings.STATIC_URL_PREFIX.rstrip("/")
    if not public_url.startswith(prefix):
        return False
    relative = public_url[len(prefix):].lstrip("/")
    path = Path(settings.UPLOAD_DIR) / relative
    if path.is_file():
        path.unlink()
        return True
    return False
