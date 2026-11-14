import os
from pathlib import Path

import uvicorn

from .api import ROOT, create_app

if __name__ == "__main__":
    data = Path(os.environ.get("HEXAPREP_DATA", ROOT / "data"))
    uvicorn.run(create_app(data_dir=data), host="127.0.0.1", port=int(os.environ.get("HEXAPREP_PORT", "8000")))
