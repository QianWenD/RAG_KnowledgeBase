#./redis-server
#./redis-cli

# cache/redis_client.py
# 导入 Redis 客户端
import redis
# 导入 JSON 处理
import json
import time

def getConnection():
    client = redis.Redis(
        host="127.0.0.1",
        port="6379",
        password="1234",
        charset="utf-8"
    )
    return client

def insertData(key,value):
    client = getConnection()
    client.set(key,value)

def getData(key):
     client = getConnection()
     data = client.get(key)
     if data != None:
         print(data.decode("utf-8"))
     else:
         print(data)

def delData(key):
    client = getConnection()
    client.delete(key)

if __name__ == '__main__':
    #key = "123"
    """insertData(key,"张程")
    getData(key)
    delData(key)
    getData(key)"""

    """insertData(key,json.dumps({"姓名":"张程","年龄":27},ensure_ascii=False))
    getData(key)
    delData(key)
    getData(key)"""

    original_key = "qa_original_questions"
    tokenized_key = "qa_tokenized_questions"
    #delData(original_key)
    #delData(tokenized_key)
    getData(original_key)

