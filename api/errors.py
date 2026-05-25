from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ApiError(Exception):
    def __init__(self, status_code: int, message: str, details=None):
        self.status_code = status_code
        self.message = message
        self.details = details
        super().__init__(message)


async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
    payload = {
        'success': False,
        'message': exc.message,
    }
    if exc.details is not None:
        payload['errors'] = exc.details

    return JSONResponse(status_code=exc.status_code, content=payload)


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else 'Request failed'
    payload = {
        'success': False,
        'message': message,
    }
    if not isinstance(exc.detail, str):
        payload['errors'] = exc.detail

    return JSONResponse(status_code=exc.status_code, content=payload)


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            'success': False,
            'message': 'Validation failed',
            'errors': exc.errors(),
        },
    )
