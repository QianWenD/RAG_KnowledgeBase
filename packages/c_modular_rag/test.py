from c_modular_rag.rag_main import main
from c_modular_rag.base import Config
from pymilvus import MilvusClient
from c_modular_rag.rag_qa.edu_document_loaders import edu_docloader,edu_imgloader,edu_pdfloader,edu_pptloader
from c_modular_rag.rag_qa.edu_text_spliter import edu_chinese_recursive_text_splitter
from c_modular_rag.rag_qa.core import document_processor,vector_store,query_classifier,strategy_selector,prompts

def get_milvus_client(conf):
    #获取milvus链接
    client = MilvusClient(uri="http://" + conf.MILVUS_HOST + ":" + conf.MILVUS_PORT)
    client.use_database(conf.MILVUS_DATABASE_NAME)
    return client

def show_data_count(conf,client):
    #查看itcast--edurag_final里有多少数据
    result = client.get_collection_stats(conf.MILVUS_COLLECTION_NAME)
    print(result)

def delete_data(conf,client):
    #删除itcast--edurag_final
    client.release_collection(collection_name=conf.MILVUS_COLLECTION_NAME)
    client.drop_collection(collection_name=conf.MILVUS_COLLECTION_NAME)

def create_database():
    #数据入库工作流
    main(query_mode=False, directory_path="../data/")

def test_create_database(conf):
    #测试数据工作流的有效性
    client = get_milvus_client(conf)
    #show_data_count(conf,client)
    #create_database()
    show_data_count(conf,client)
    #delete_data(conf,client)
    #show_data_count(conf,client)

def load_docx():
    docx_loader = edu_docloader.OCRDOCLoader(filepath='../data/ocr_samples/ocr_02.docx')
    doc = docx_loader.load()
    print(doc)

def load_pdf():
    pdf_loader = edu_pdfloader.OCRPDFLoader(file_path="../data/ocr_samples/ocr_03.pdf")
    doc = pdf_loader.load()
    print(doc)

def load_img():
    img_loader = edu_imgloader.OCRIMGLoader(img_path='../data/ocr_samples/ocr_04.png')
    doc = img_loader.load()
    print(doc)

def load_pptx():
    img_loader = edu_pptloader.OCRPPTLoader(filepath='../data/ocr_samples/ocr_01.pptx')
    doc = img_loader.load()
    print(doc)

def test_document_loader():
    #测试文档加载
    #load_docx()
    load_pdf()
    #load_img()
    #load_pptx()

def test_split():
    text_splitter = edu_chinese_recursive_text_splitter.ChineseRecursiveTextSplitter(
        keep_separator=True,
        is_separator_regex=True,
        chunk_size=150,
        chunk_overlap=10
    )
    ls = [
        """中国对外贸易形势报告（75页）。前 10 个月，一般贸易进出口 19.5 万亿元，增长 25.1%， 比整体进出口增速高出 2.9 个百分点，占进出口总额的 61.7%，较去年同期提升 1.6 个百分点。其中，一般贸易出口 10.6 万亿元，增长 25.3%，占出口总额的 60.9%，提升 1.5 个百分点；进口8.9万亿元，增长24.9%，占进口总额的62.7%， 提升 1.8 个百分点。加工贸易进出口 6.8 万亿元，增长 11.8%， 占进出口总额的 21.5%，减少 2.0 个百分点。其中，出口增 长 10.4%，占出口总额的 24.3%，减少 2.6 个百分点；进口增 长 14.2%，占进口总额的 18.0%，减少 1.2 个百分点。此外， 以保税物流方式进出口 3.96 万亿元，增长 27.9%。其中，出 口 1.47 万亿元，增长 38.9%；进口 2.49 万亿元，增长 22.2%。前三季度，中国服务贸易继续保持快速增长态势。服务 进出口总额 37834.3 亿元，增长 11.6%；其中服务出口 17820.9 亿元，增长 27.3%；进口 20013.4 亿元，增长 0.5%，进口增 速实现了疫情以来的首次转正。服务出口增幅大于进口 26.8 个百分点，带动服务贸易逆差下降 62.9%至 2192.5 亿元。服 务贸易结构持续优化，知识密集型服务进出口 16917.7 亿元， 增长 13.3%，占服务进出口总额的比重达到 44.7%，提升 0.7 个百分点。 二、中国对外贸易发展环境分析和展望 全球疫情起伏反复，经济复苏分化加剧，大宗商品价格 上涨、能源紧缺、运力紧张及发达经济体政策调整外溢等风 险交织叠加。同时也要看到，我国经济长期向好的趋势没有 改变，外贸企业韧性和活力不断增强，新业态新模式加快发 展，创新转型步伐提速。产业链供应链面临挑战。美欧等加快出台制造业回迁计 划，加速产业链供应链本土布局，跨国公司调整产业链供应 链，全球双链面临新一轮重构，区域化、近岸化、本土化、 短链化趋势凸显。疫苗供应不足，制造业“缺芯”、物流受限、 运价高企，全球产业链供应链面临压力。 全球通胀持续高位运行。能源价格上涨加大主要经济体 的通胀压力，增加全球经济复苏的不确定性。世界银行今年 10 月发布《大宗商品市场展望》指出，能源价格在 2021 年 大涨逾 80%，并且仍将在 2022 年小幅上涨。IMF 指出，全 球通胀上行风险加剧，通胀前景存在巨大不确定性。""",
    ]
    # text = """"""
    for inum, text in enumerate(ls):
        chunks = text_splitter.split_text(text)
        for chunk in chunks:
            print(len(chunk),chunk)
            print('*' * 80)

def test_document_processor():
    directory_path = '../data/ai_data'
    child_chunks = document_processor.process_documents(directory_path)
    print(f'child_chunks--》{child_chunks[0]}')

def test_insert_to_milvus():
    vs = vector_store.VectorStore()
    directory_path = '../data/ai_data'
    print(f"embedding_function.dim--》{vs.embedding_function.dim}")
    documents = document_processor.process_documents(directory_path)
    vs.add_documents(documents)

def train_classifier():
    query_classify = query_classifier.QueryClassifier()
    data_file = '../../classify_data/model_generic_5000.json'
    query_classify.train_model(data_file)

def test_classifier():
    query_classify = query_classifier.QueryClassifier()
    query = "AI的课程大纲是什么"
    query = "天空为什么是蓝色的？"
    result = query_classify.predict_category(query=query)
    print(result)

def test_select_strategy():
    ss = strategy_selector.StrategySelector()

    query = "AI学科都有哪些课程？"
    result = ss.select_strategy(query=query)
    print(query, result)

    query = "人工智能在哪些领域没有显著优势？"
    result = ss.select_strategy(query=query)
    print(query, result)

    query = "gpt4和deepseek的优点和缺点都有哪些？"
    result = ss.select_strategy(query=query)
    print(query, result)

    query = "Mysql数据库能不能支持100w个样本的插入"
    result = ss.select_strategy(query=query)
    print(query,result)

def test_hypothetical():
    query = "人工智能在哪些领域没有显著优势？"
    llm = strategy_selector.StrategySelector().call_dashscope
    subquery_prompt_template = prompts.RAGPrompts.hyde_prompt()
    subqueries_text = llm(subquery_prompt_template.format(query=query)).strip()
    print(subqueries_text)

def test_sub_queries():
    query = "gpt4和deepseek的优点和缺点都有哪些？"
    llm = strategy_selector.StrategySelector().call_dashscope
    subquery_prompt_template = prompts.RAGPrompts.subquery_prompt()
    subqueries_text = llm(subquery_prompt_template.format(query=query)).strip()
    print(subqueries_text)

def test_back_tracking():
    query = "Mysql数据库能不能支持100w个样本的插入"
    llm = strategy_selector.StrategySelector().call_dashscope
    subquery_prompt_template = prompts.RAGPrompts.backtracking_prompt()
    subqueries_text = llm(subquery_prompt_template.format(query=query)).strip()
    print(subqueries_text)

def test_hybird_search():
    vs = vector_store.VectorStore()
    query = "AI学科的课程内容是什么"
    results = vs.hybrid_search_with_rerank(query, source_filter='ai')
    print(f'results-->{results}')
    print(f'results-->{len(results)}')

def test_generate_answer():
    query = "AI课程总共有多少门课？我可以打哪个电话咨询详情？"
    query = "AI速成班4期的授课老师是谁？"

    context = """AI速成班4期的开学日期是9月1日
                 AI速成班课程表总共有16门课程
                """
    llm = strategy_selector.StrategySelector().call_dashscope
    prompt_input = prompts.RAGPrompts.rag_prompt().format(
        context=context, history="", question=query, phone=conf.CUSTOMER_SERVICE_PHONE
    )
    answer = llm(prompt_input)
    print(answer)

if __name__ == '__main__':
    conf = Config()

    #test_document_loader()

    #test_split()

    #test_document_processor()

    #test_insert_to_milvus()

    #test_create_database(conf)




    #train_classifier()
    #test_classifier()

    #test_select_strategy()

    test_hypothetical()
    #test_sub_queries()
    #test_back_tracking()

    #test_hybird_search()

    #test_generate_answer()