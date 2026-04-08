from b_traditional_qa.mysql_qa.db.mysql_client import MySQLClient


def create_table():
    mysql_client = MySQLClient()
    mysql_client.create_table()
    mysql_client.insert_data(csv_path='../data/JP学科知识问答.csv')
    mysql_client.close()

def get_all_questions():
    mysql_client = MySQLClient()
    results = mysql_client.fetch_questions()
    print(f'results--》{results}')
    mysql_client.close()

def get_question():
    mysql_client = MySQLClient()
    a = mysql_client.fetch_answer(question="在磁盘中无法新建文本文档")
    print(f'a--》{a}')
    mysql_client.close()

if __name__ == '__main__':
    create_table()
    #get_all_questions()
    #get_question()