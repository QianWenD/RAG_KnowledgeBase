from __future__ import annotations


def build_general_chat_prompt(
    *,
    query: str,
    customer_service_phone: str = "",
) -> str:
    customer_hint = ""
    if customer_service_phone:
        customer_hint = (
            f"\n如果用户明确需要人工支持，可以提示客服电话：{customer_service_phone}。"
        )

    return (
        "你是 RAGPro 问答系统的助手。\n"
        "当前问题不需要检索知识库，请直接用自然、简洁、友好的中文回答。\n"
        "如果用户是在打招呼、致谢，或询问你的能力与使用方式，请直接回应。\n"
        "不要编造专业事实，不要假装引用知识库。"
        f"{customer_hint}\n\n"
        f"用户问题：{query}"
    )
