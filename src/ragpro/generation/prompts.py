from __future__ import annotations


def build_rag_prompt(
    *,
    question: str,
    context: str,
    history: str = "",
    customer_service_phone: str = "",
) -> str:
    customer_service_hint = (
        f"如需人工进一步确认，可建议用户联系客服电话：{customer_service_phone}。"
        if customer_service_phone
        else "如果信息不足，请明确说明暂时无法确认。"
    )

    return f"""
你是一个面向知识库问答场景的智能助手。请严格遵守以下规则：
1. 优先依据“检索资料”作答，不要脱离资料随意补充事实。
2. 如果资料不足，只能做审慎推断，并明确标注“这是基于现有资料的推断”。
3. 如果资料无法支持答案，请直接说明信息不足。{customer_service_hint}
4. 回答尽量结构清晰，先给结论，再给依据。
5. 不要捏造来源，不要编造时间、价格、政策或课程信息。

对话历史：
{history}

检索资料：
{context}

用户问题：
{question}

请输出最终回答：
""".strip()
