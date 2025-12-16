from kernel.pack_runtime import register_pack

PACK_ID = "school.attendance"

def handler(payload):
    return {
        "message": "attendance_recorded",
        "student_id": payload.get("student_id"),
        "status": payload.get("status"),
    }

register_pack(PACK_ID, handler)
