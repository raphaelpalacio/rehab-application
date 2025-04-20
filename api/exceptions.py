from fastapi import HTTPException, status

class UnAuthorizedException(HTTPException):
    def __init__(self, detail: any = None) -> None:
        super().__init__(status.HTTP_401_UNAUTHORIZED, detail=detail)
        
class BadRequestException(HTTPException):
    def __init__(self, detail: any = None) -> None:
        super().__init__(status.HTTP_400_BAD_REQUEST, detail=detail)
