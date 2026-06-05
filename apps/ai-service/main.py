from fastapi import FastAPI

app = FastAPI(title="MasjidLink AI Service", version="1.0.0")

@app.get("/")
def read_root():
    return {"message": "Welcome to MasjidLink AI Service API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
