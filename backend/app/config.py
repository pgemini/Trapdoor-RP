from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_deployment: str = "gpt-4o-mini"
    azure_openai_api_version: str = "2024-08-01-preview"

    # Speech-to-text — used for scanning audio + video CONTENT (not just tags).
    # Set ONE of:
    #   - AZURE_WHISPER_DEPLOYMENT  (classic Whisper batch deployment)
    #   - AZURE_REALTIME_DEPLOYMENT (Azure AI Foundry gpt-realtime, WebSocket)
    #   - OPENAI_API_KEY            (direct OpenAI whisper-1)
    azure_whisper_deployment: str = ""
    azure_realtime_deployment: str = ""
    azure_realtime_endpoint: str = ""
    openai_api_key: str = ""

    trapdoor_host: str = "127.0.0.1"
    trapdoor_port: int = 8000
    trapdoor_max_upload_mb: int = 25
    trapdoor_transcribe_max_mb: int = 24  # OpenAI Whisper API cap

    @property
    def ai_foundry_enabled(self) -> bool:
        return bool(self.azure_openai_endpoint and self.azure_openai_api_key)

    @property
    def transcription_enabled(self) -> bool:
        if self.azure_whisper_deployment and self.ai_foundry_enabled:
            return True
        if self.azure_realtime_deployment and self.azure_openai_api_key:
            return True
        return bool(self.openai_api_key)


settings = Settings()
