# -*- coding:utf-8 -*-
import pymysql
import pandas as pd

def getConnection():
    connection = pymysql.connect(
        host="127.0.0.1",
        user="root",
        password="123456",
        database="test"
    )
    return connection

def createTable():
    connection = getConnection()
    cursor = connection.cursor()
    create_table_query = '''CREATE TABLE IF NOT EXISTS jpkb (
                id INT AUTO_INCREMENT PRIMARY KEY,
                subject_name VARCHAR(20),
                question VARCHAR(1000),
                answer VARCHAR(1000))'''
    cursor.execute(create_table_query)
    connection.commit()
    connection.close()

def insertData():
    data = pd.read_csv("../data/JP学科知识问答.csv")
    print(data.head())

    connection = getConnection()
    cursor = connection.cursor()

    for _, row in data.iterrows():
        insert_query = "INSERT INTO jpkb (subject_name, question, answer) VALUES (%s, %s, %s)"
        cursor.execute(insert_query, (row["学科名称"], row["问题"], row["答案"]))
    connection.commit()
    connection.close()

def getData():
    connection = getConnection()
    cursor = connection.cursor()

    cursor.execute("SELECT subject_name, question, answer FROM jpkb limit 10")
    results = cursor.fetchall()
    for result in results:
        print(result)

    connection.close()


if __name__ == '__main__':
    #createTable()
    #insertData()
    getData()
