import os
from pydantic_settings import BaseSettings
from typing import List, Union
from pydantic import field_validator

class Settings(BaseSettings):
    ENV: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # LLM API Keys
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    
    # LLM Selection
    LLM_PROVIDER: str = "groq"  # groq | openai
    LLM_MODEL: str = "llama3-8b-8192"
    
    # Transcription Settings
    WHISPER_MODE: str = "local"  # local | api
    WHISPER_LOCAL_MODEL: str = "base"  # tiny | base | small | medium
    WHISPER_API_PROVIDER: str = "openai"  # openai | groq
    
    # Disk Storage Directories
    DOWNLOADS_DIR: str = "./downloads"
    INDEXES_DIR: str = "./indexes"
    DATA_DIR: str = "./data"
    
    # CORS Allowed Origins
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [x.strip() for x in v.split(",")]
        elif isinstance(v, list):
            return v
        return ["http://localhost:5173"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Allow extra env vars in the file without raising validation errors

settings = Settings()

# Ensure that storage folders exist locally
os.makedirs(settings.DOWNLOADS_DIR, exist_ok=True)
os.makedirs(settings.INDEXES_DIR, exist_ok=True)
os.makedirs(settings.DATA_DIR, exist_ok=True)
