from typing import Dict, Generic, TypeVar
from pydantic import BaseModel, Field
from typing_extensions import Literal

ResponseT = TypeVar("ResponseT")

class SuccessResponse(BaseModel, Generic[ResponseT]):
    status: Literal["success"] = "success"
    message: str = Field(..., description="Human-readable description of the operation result")
    data: ResponseT  


class ValidationErrorResponse(BaseModel):
    status: Literal["error"] = "error"
    type: Literal["VALIDATION_ERROR"] = "VALIDATION_ERROR"
    message: str = Field(default="Please correct the highlighted field")
    errors: Dict[str, str]


class GlobalErrorResponse(BaseModel):
    status: Literal["error"] = "error"
    type: Literal["GLOBAL_ERROR"] = "GLOBAL_ERROR"
    message: str = Field(..., description="The error message passed from the raise HTTPException call")

