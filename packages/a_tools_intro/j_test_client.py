# -*- coding: utf-8 -*-
import requests

import threading

# 配置 FastAPI 服务的接口地址
#API_URL = "http://localhost:5000/cook_sync"
API_URL = "http://localhost:8002/cook_async"
def test():
    print("发起请求")
    with requests.post(API_URL, json=[], stream=True) as response:
        # 检查 HTTP 状态码是否为 200（成功）
        if response.status_code != 200:
            # 如果失败，打印错误状态码和响应内容
            print(f"\n请求失败: {response.status_code} - {response.text}")
            return  # 提前退出函数
        print(response.text)


if __name__ == "__main__":
    for i in range(3):
        p = threading.Thread(target=test)
        p.start()
    #test()