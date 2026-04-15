from fastapi import FastAPI
from routes.predictions import router as predictions_router

app = FastAPI()

# include routes
app.include_router(predictions_router)

@app.get("/")
def root():
    return {"message": "iPredict API is running"}