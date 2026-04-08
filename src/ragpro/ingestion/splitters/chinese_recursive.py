from __future__ import annotations

import re
from typing import Any

from langchain.text_splitter import RecursiveCharacterTextSplitter


def _split_text_with_regex_from_end(
    text: str,
    separator: str,
    keep_separator: bool,
) -> list[str]:
    if separator:
        if keep_separator:
            raw = re.split(f"({separator})", text)
            splits = ["".join(i) for i in zip(raw[0::2], raw[1::2])]
            if len(raw) % 2 == 1:
                splits += raw[-1:]
        else:
            splits = re.split(separator, text)
    else:
        splits = list(text)
    return [s for s in splits if s]


class ChineseRecursiveTextSplitter(RecursiveCharacterTextSplitter):
    def __init__(
        self,
        separators: list[str] | None = None,
        keep_separator: bool = True,
        is_separator_regex: bool = True,
        **kwargs: Any,
    ) -> None:
        super().__init__(keep_separator=keep_separator, **kwargs)
        self._separators = separators or [
            "\n\n",
            "\n",
            "。|！|？",
            r"\.\s|\!\s|\?\s",
            "；|;\s",
            "，|,\s",
        ]
        self._is_separator_regex = is_separator_regex

    def _split_text(self, text: str, separators: list[str]) -> list[str]:
        final_chunks: list[str] = []
        separator = separators[-1]
        new_separators: list[str] = []

        for i, current in enumerate(separators):
            candidate = current if self._is_separator_regex else re.escape(current)
            if current == "":
                separator = current
                break
            if re.search(candidate, text):
                separator = current
                new_separators = separators[i + 1 :]
                break

        candidate = separator if self._is_separator_regex else re.escape(separator)
        splits = _split_text_with_regex_from_end(text, candidate, self._keep_separator)

        good_splits: list[str] = []
        merge_separator = "" if self._keep_separator else separator
        for item in splits:
            if self._length_function(item) < self._chunk_size:
                good_splits.append(item)
                continue
            if good_splits:
                final_chunks.extend(self._merge_splits(good_splits, merge_separator))
                good_splits = []
            if not new_separators:
                final_chunks.append(item)
            else:
                final_chunks.extend(self._split_text(item, new_separators))

        if good_splits:
            final_chunks.extend(self._merge_splits(good_splits, merge_separator))

        return [
            re.sub(r"\n{2,}", "\n", chunk.strip())
            for chunk in final_chunks
            if chunk.strip()
        ]
