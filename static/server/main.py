from fastapi import FastAPI
from server.router_loader import load_all_pack_routes
app = FastAPI()
load_all_pack_routes(app)
@app.get("/")
def root():
    return {"msg": "AUTUS Core Running"}
