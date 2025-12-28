from pydantic import BaseModel
from typing import Literal
from datetime import datetime


class ApplyActionRequest(BaseModel):
    action: Literal["hold", "push", "drift"]
    client_ts: datetime
