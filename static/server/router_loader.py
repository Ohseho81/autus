import importlib
import os
def load_all_pack_routes(app):
    base = "packs"
    for pack in os.listdir(base):
        pack_dir = os.path.join(base, pack)
        routes_file = os.path.join(pack_dir, "routes.py")
        if os.path.isfile(routes_file):
            module_path = f"{base}.{pack}.routes"
            module = importlib.import_module(module_path)
            app.include_router(module.router)
