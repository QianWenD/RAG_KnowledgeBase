# FastAPI (异步)
from fastapi import FastAPI
import asyncio # Python 的异步库

app = FastAPI()

@app.post('/cook_async')
async def cook_async(): # 注意这里的 async
    print("开始做菜 A (异步)...")
    await asyncio.sleep(5) # 模拟做一个很慢的菜，但这里用 await
                           # 表示“在这里等待，但允许服务器去做别的事”
    print("菜 A (异步) 做好了!")
    return "菜 A (异步) 完成"

# 当一个请求访问 /cook_async 时，服务器在 `await asyncio.sleep(5)` 这里
# 会“暂停”这个任务，转而去处理其他进来的请求。5秒后，当等待结束，
# 服务器会回来继续执行这个任务。这使得服务器能同时处理很多“等待中”的请求。

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)