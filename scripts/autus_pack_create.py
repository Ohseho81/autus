import os
import sys
import json

def create_pack(name, category="custom", version="0.1.0"):
    pack_dir = os.path.join("packs", name)
    if os.path.exists(pack_dir):
        print(f"Pack '{name}' already exists.")
        return
    os.makedirs(pack_dir, exist_ok=True)
    meta = {
        "pack_id": name,
        "category": category,
        "version": version,
        "protocol_bindings": {"identity": True, "memory": True, "workflow": True}
    }
    with open(os.path.join(pack_dir, "meta.json"), "w") as f:
        json.dump(meta, f, indent=2)
    class_name = name.title().replace('_','') + "Service"
    with open(os.path.join(pack_dir, "service.py"), "w") as f:
        f.write(f"""class {class_name}:\n    def run(self, payload):\n        return {{\"{name}\": \"ok\", \"input\": payload}}\n""")
    with open(os.path.join(pack_dir, "routes.py"), "w") as f:
        f.write(f"""from fastapi import APIRouter\nfrom .service import {class_name}\n\nrouter = APIRouter(prefix=\"/pack/{name}\")\n\n@router.post(\"/run\")\ndef run(payload: dict):\n    return {class_name}().run(payload)\n""")
    print(f"Pack '{name}' created at {pack_dir}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python autus_pack_create.py <pack_name> [category] [version]")
        sys.exit(1)
    name = sys.argv[1]
    category = sys.argv[2] if len(sys.argv) > 2 else "custom"
    version = sys.argv[3] if len(sys.argv) > 3 else "0.1.0"
    create_pack(name, category, version)
