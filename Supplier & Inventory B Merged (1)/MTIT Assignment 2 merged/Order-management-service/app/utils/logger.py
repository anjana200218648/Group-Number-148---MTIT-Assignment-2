from loguru import logger
import sys
import os

# Fix Windows console emoji encoding issues
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level=LOG_LEVEL,
    colorize=True,
)
logger.add(
    "logs/order_service.log",
    rotation="10 MB",
    retention="7 days",
    level="DEBUG",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
)


def log_order_action(action: str, order_id: str, details: dict = None):
    """Log order-specific actions with structured data."""
    log_msg = f"ORDER ACTION | action={action} | order_id={order_id}"
    if details:
        for key, val in details.items():
            log_msg += f" | {key}={val}"
    logger.info(log_msg)


def log_error(context: str, error: Exception, order_id: str = None):
    """Log errors with context."""
    order_part = f" | order_id={order_id}" if order_id else ""
    logger.error(f"ERROR | context={context}{order_part} | error={str(error)}")
