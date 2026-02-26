from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_repo: str = "Qwen/Qwen2.5-0.5B-Instruct-GGUF"
    model_filename: str = "qwen2.5-0.5b-instruct-q5_k_m.gguf"
    n_ctx: int = 8192
    max_new_tokens: int = 512
    generation_timeout_s: float = 30.0
    api_port: int = 8000
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    log_level: str = "INFO"
    temperature: float = 0.7
    top_p: float = 0.9
    repetition_penalty: float = 1.1
    max_history_messages: int = 10
    num_threads: int = 0

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
