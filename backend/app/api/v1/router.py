from fastapi import APIRouter

from app.api.v1.endpoints import auth, business, products, users

api_router = APIRouter()

# Naya endpoint module banao to yahan register karna na bhoolo
api_router.include_router(auth.router)
api_router.include_router(business.router)
api_router.include_router(users.router)
api_router.include_router(products.router)
