# Flask (同步)
from flask import Flask
import time

app = Flask(__name__)

@app.route('/cook_sync/',methods=['GET','POST'])
def cook_sync():
    print("开始做菜 A...")
    time.sleep(5) # 模拟做一个很慢的菜 (比如等大模型响应)
    print("菜 A 做好了!")
    return "菜 A 完成"

if __name__ == '__main__':
    #import uvicorn
    #uvicorn.run(app, host="0.0.0.0", port=8002)
    app.run()