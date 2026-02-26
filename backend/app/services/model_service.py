import asyncio
import logging
import os
import time
from typing import AsyncGenerator

from huggingface_hub import hf_hub_download
from llama_cpp import Llama

from app.config import settings

logger = logging.getLogger(__name__)

_SENTINEL = object()


class ModelService:
    def __init__(self) -> None:
        self.model: Llama | None = None
        self._loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def load_model(self) -> None:
        num_threads = settings.num_threads
        if num_threads <= 0:
            num_threads = max(1, os.cpu_count() // 2)

        logger.info(
            "Downloading model: %s / %s",
            settings.model_repo,
            settings.model_filename,
        )
        model_path = hf_hub_download(
            repo_id=settings.model_repo,
            filename=settings.model_filename,
        )

        logger.info("Loading model with %d threads, n_ctx=%d", num_threads, settings.n_ctx)
        self.model = Llama(
            model_path=model_path,
            n_ctx=settings.n_ctx,
            n_threads=num_threads,
            n_threads_batch=num_threads,
            verbose=False,
        )

        self._loaded = True
        logger.info("Model ready (llama.cpp)")

    def _truncate_history(
        self, messages: list[dict[str, str]]
    ) -> list[dict[str, str]]:
        limit = settings.max_history_messages
        if len(messages) <= limit:
            return messages
        system_msgs = [m for m in messages if m["role"] == "system"]
        other_msgs = [m for m in messages if m["role"] != "system"]
        return system_msgs + other_msgs[-(limit - len(system_msgs)):]

    async def generate_stream_async(
        self, messages: list[dict[str, str]]
    ) -> AsyncGenerator[dict, None]:
        if not self._loaded:
            raise RuntimeError("Model is not loaded")

        truncated = self._truncate_history(messages)
        start = time.perf_counter()
        tokens_generated = 0

        loop = asyncio.get_running_loop()

        stream = self.model.create_chat_completion(
            messages=truncated,
            max_tokens=settings.max_new_tokens,
            temperature=settings.temperature,
            top_p=settings.top_p,
            repeat_penalty=settings.repetition_penalty,
            stream=True,
        )
        stream_iter = iter(stream)

        while True:
            chunk = await loop.run_in_executor(
                None, next, stream_iter, _SENTINEL
            )
            if chunk is _SENTINEL:
                break

            delta = chunk["choices"][0].get("delta", {})
            content = delta.get("content", "")
            if content:
                tokens_generated += 1
                yield {"event": "token", "data": content}

        elapsed = time.perf_counter() - start
        self._enforce_budget(elapsed, tokens_generated)

        yield {
            "event": "metadata",
            "data": {
                "tokens_generated": tokens_generated,
                "elapsed_s": round(elapsed, 2),
            },
        }

    def _enforce_budget(self, elapsed: float, tokens_generated: int) -> None:
        if elapsed > settings.generation_timeout_s:
            logger.warning(
                "Generation exceeded budget: %.2fs (limit %.1fs)",
                elapsed,
                settings.generation_timeout_s,
                extra={
                    "tokens_generated": tokens_generated,
                    "elapsed_s": round(elapsed, 2),
                },
            )


model_service = ModelService()
