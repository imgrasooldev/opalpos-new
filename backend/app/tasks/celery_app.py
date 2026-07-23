"""Celery app — Laravel Queue + Console/Kernel.php schedule ka replacement."""

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "opalpos",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.backup",
        "app.tasks.notifications",
        "app.tasks.reports",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,              # worker crash ho to task dobara chale
    worker_prefetch_multiplier=1,     # lambe tasks fairly bantein
    task_time_limit=600,
    task_soft_time_limit=540,
    result_expires=3600,
)

# Laravel: $schedule->command('backup:run')->dailyAt('23:50')
celery_app.conf.beat_schedule = {
    "daily-backup": {
        "task": "app.tasks.backup.run_backup",
        "schedule": crontab(hour=23, minute=50),
    },
    "cleanup-old-backups": {
        "task": "app.tasks.backup.clean_backups",
        "schedule": crontab(hour=2, minute=0),
    },
}
