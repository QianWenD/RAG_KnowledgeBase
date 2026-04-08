# -*-coding:utf-8-*-
import jieba
from rank_bm25 import BM25L


class BM25Search():
    def __init__(self, documents):
        # documents:代表所有的文档
        self.documents = documents
        # 对所有的文档进行分词
        self.tokenized_docs = [jieba.lcut(doc) for doc in documents]
        # 实例化BM25模型
        self.bm25 = BM25L(self.tokenized_docs)

    def search(self, query):
        # 对query进行分词
        tokenized_query = jieba.lcut(query)
        try:
            # 计算query和每个doc的bm25的分数
            scores = self.bm25.get_scores(tokenized_query)
            print(f'scores--》{scores}')
            # 获得最高分数的索引
            best_idx = scores.argmax()
            # print(f'best_idx-->{best_idx}')
            # 获取最匹配的doc以及对应的分数
            best_score = scores[best_idx]
            best_doc = self.documents[best_idx]
            return best_doc, best_score
        except Exception as e:
            return None, 0


if __name__ == '__main__':
    documents = ["我喜欢编程", "编程很有趣","我吃了一个苹果"]
    bm25_model = BM25Search(documents)
    query = "他从前喜欢编程"
    result, score = bm25_model.search(query)
    print(result)
    print(score)