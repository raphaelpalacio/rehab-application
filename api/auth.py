from fastapi import Depends
from fastapi.security import SecurityScopes, HTTPAuthorizationCredentials, HTTPBearer
from exceptions import UnAuthorizedException
from firebase_admin import auth
from config import firebase_app, settings
from pydantic import BaseModel, Field
from logger import logger
from typing import Literal
"""
This class contains the contents of a Firebase user
"""
class FBUser(BaseModel):
    uid: str
    email: str
    email_verified: bool
    display_name: str = Field(..., description="The display name of the user", alias="name")
    picture: str
    role: Literal["doctor", "patient"] | None = None

_test_user = FBUser(
    uid="test-uid",
    email="test-email@gmail.com",
    email_verified=True,
    name="test-name",
    picture="https://fastly.picsum.photos/id/371/200/300.jpg?hmac=CZPdOAGtsgzhjapSpcZbjc4cFkTu5gWl9PFxBRY369c",
)

class VerifyJWT:
    """
    This class will contain a verify method which decodes a bearer token
    and authenticates against Firebase
    """

    def __init__(self):
        pass

    async def verify(
        self, 
        security_scopes: SecurityScopes, 
        token: HTTPAuthorizationCredentials | None = Depends(HTTPBearer())
    ) -> FBUser:
        logger.info(f"Verifying JWT token with scopes ${security_scopes.scopes}")
        if settings.bypass_auth:
            # Bypass authentication for testing
            return _test_user

        if token is None: raise UnAuthorizedException("Requires Authentication Token")

        # This is unneeded, but here in case
        scopes: list[str] = security_scopes.scopes
        # Authorization header with Bearer prefix removed
        bearer_token: str = token.credentials

        try:
            decode = auth.verify_id_token(
                id_token=bearer_token,
                app=firebase_app,
                
                # Enable this if we care later
                check_revoked=False
            )

            user = FBUser.model_validate(decode)
            if len(scopes) > 0 and user.role not in scopes:
                raise UnAuthorizedException("User does not have the required role")

            return user
        except auth.RevokedIdTokenError:
            # We will need to enable check_revoked to encounter this
            raise UnAuthorizedException("Requires re-authentication")
        except auth.UserDisabledError:
            raise UnAuthorizedException("User is disabled")
        except auth.InvalidIdTokenError:
            raise UnAuthorizedException("Invalid ID token provided")
        except auth.ExpiredIdTokenError:
            raise UnAuthorizedException("ID token expired")
        except UnAuthorizedException:
            raise
        except Exception as e:
            print(e)
            raise UnAuthorizedException("ID token is invalid")

verifier = VerifyJWT().verify
