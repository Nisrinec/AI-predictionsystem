from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.predictions import router as predictions_router

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# include routes
app.include_router(predictions_router)

@app.get("/")
def root():
    return {"message": "iPredict API is running"}