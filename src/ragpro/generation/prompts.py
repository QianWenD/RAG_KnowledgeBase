from __future__ import annotations


def build_rag_prompt(
    *,
    question: str,
    context: str,
    history: str = "",
    customer_service_phone: str = "",
) -> str:
    return f"""
你是一个智能助理，负责帮助用户回答问题。请遵循以下规则：
1. 优先基于提供的上下文回答。
2. 如果上下文不足，再结合常识谨慎回答。
3. 如果答案明显来自检索材料，请明确说明是基于检索内容整理得出。
4. 如果信息不足，直接说明无法确认；如有客服电话，可提示用户联系：{customer_service_phone}

对话历史：
{history}

上下文：
{context}

问题：
{question}

回答：
""".strip()
