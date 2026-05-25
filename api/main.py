from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

try:
    from .errors import ApiError, api_error_handler, http_exception_handler, validation_exception_handler
    from .routes import router
    from .settings import get_settings
except Exception:
    from errors import ApiError, api_error_handler, http_exception_handler, validation_exception_handler
    from routes import router
    from settings import get_settings

settings = get_settings()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version='0.1.0')

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.parsed_cors_origins,
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
    )

    app.add_exception_handler(ApiError, api_error_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    @app.get('/health')
    async def health_check() -> dict:
        return {
            'success': True,
            'message': 'Service is healthy.',
            'data': {
                'status': 'ok',
                'timestamp': datetime.now(timezone.utc).isoformat(),
            },
        }

    app.include_router(router, prefix=settings.api_prefix)

    return app


app = create_app()
