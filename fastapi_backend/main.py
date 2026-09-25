import uvicorn 

from fastapi import FastAPI, status, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse  
from fastapi.middleware.cors import CORSMiddleware


from unified_response import ValidationErrorResponse, GlobalErrorResponse


from auth.routes import router as auth_router
from therapist.routes import router as therapist_router 

app = FastAPI(
    responses={  
        status.HTTP_422_UNPROCESSABLE_CONTENT: {  
            "model": ValidationErrorResponse,
            "description": "Field Validation Errors (Pydantic structural failures)"  
        },
        status.HTTP_400_BAD_REQUEST: {
            "model": GlobalErrorResponse,
            "description": "Global Request Error"
        },
        status.HTTP_401_UNAUTHORIZED: {
            "model": GlobalErrorResponse,
            "description": "Authentication Failure"  
        },
        status.HTTP_403_FORBIDDEN: {
            "model": GlobalErrorResponse,
            "description": "Authorization Block"  
        },
        status.HTTP_404_NOT_FOUND: {
            "model": GlobalErrorResponse,
            "description": "Resource Missing"
        }
    }
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)




app.include_router(auth_router)
app.include_router(therapist_router)

@app.exception_handler(RequestValidationError)
async def custom_validation_exception_handler(request, exc):
    clean_errors = {}
    for error in exc.errors():
        field_name = error["loc"][-1]
        clean_errors[str(field_name)] = error["msg"]

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "error",
            "type": "VALIDATION_ERROR",
            "message": "Please correct the highlighted fields",
            "errors": clean_errors
        }
    )

@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "type": "GLOBAL_ERROR",
            "message": exc.detail
        }
    )

def main():
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

if __name__ == "__main__":
    main()

