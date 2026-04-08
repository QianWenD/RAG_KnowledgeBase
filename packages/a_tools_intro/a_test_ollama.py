import ollama
from ollama import Client
import requests

def chatMode():
    # 聊天模式
    response = ollama.chat(model='qwen2.5:7b',
                           messages=[{'role': 'user', 'content': '为什么天空是蓝色的？', }])
    print(response)
    print(response['message']['content'])

def streamMode():
    #流式输出
    stream = ollama.chat(
        model='qwen2.5:7b',
        messages=[{'role': 'user', 'content': '为什么天空是蓝色的？'}],
        stream=True,
    )

    for chunk in stream:
        print(chunk['message']['content'], end='', flush=True)

def remoteMode():
    #远程调用
    # client = Client(host='http://192.168.1.100:11434')
    client = Client(host='http://127.0.0.1:11434')

    response = client.chat(model='qwen2.5:7b', messages=[
      {
        'role': 'user',
        'content': '为什么天空是蓝色的？',
      },
    ])
    print(response['message']['content'])

def rawMode():
    #原始模式
    host = "127.0.0.1"
    port = "11434"
    url = f"http://{host}:{port}/api/chat"
    model = "qwen2.5:7b"
    headers = {"Content-Type": "application/json"}
    data = {
        "model": model,  # 模型选择
        "options": {
            "temperature": 0.5
        },
        "stream": False,  # 流式输出
        "messages": [{
            "role": "system",
            "content": "你是谁？"
        }]  # 对话列表
    }
    response = requests.post(url, json=data, headers=headers, timeout=60)
    res = response.json()
    print(res)
    print(res['message']['content'])

if __name__ == '__main__':
    #chatMode()
    #streamMode()
    #remoteMode()
    rawMode()