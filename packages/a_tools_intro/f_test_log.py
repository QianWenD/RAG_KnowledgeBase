import logging

def basicLog():
    # 配置基本的日志设置
    logging.basicConfig(level=logging.INFO)

    # 获取日志记录器
    logger = logging.getLogger("Example1")

    # 记录不同级别的日志
    logger.debug("这是调试信息，通常用于开发")
    logger.info("程序运行正常")
    logger.warning("注意，可能有小问题")
    logger.error("发生错误")
    logger.critical("严重错误，程序可能崩溃")

def withFormat():
    # 配置日志格式
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )

    # 获取日志记录器
    logger = logging.getLogger("Example2")

    # 记录日志
    logger.debug("调试模式已开启")
    logger.info("正在处理数据")
    logger.error("数据处理失败")

def save2File():
    # 配置日志，输出到文件
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        filename='app.log',  # 日志文件路径
        filemode='a',  # 'a'表示追加，'w'表示覆盖
        encoding='utf-8'
    )

    # 获取日志记录器
    logger = logging.getLogger("Example3")

    # 记录日志
    logger.info("程序启动")
    logger.warning("内存使用率较高")
    logger.error("无法连接数据库")

def consoleAndFile():
    # 创建日志记录器
    logger = logging.getLogger("Example4")
    logger.setLevel(logging.DEBUG)  # 设置记录器级别

    # 创建控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)  # 控制台显示INFO及以上级别

    # 创建文件处理器
    file_handler = logging.FileHandler('app.log', mode='a',encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)  # 文件记录DEBUG及以上级别

    # 定义日志格式
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')

    # 为处理器设置格式
    console_handler.setFormatter(formatter)
    file_handler.setFormatter(formatter)

    # 将处理器添加到记录器
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

    # 记录日志
    logger.debug("调试信息，仅写入文件")
    logger.info("程序运行正常")
    logger.error("发生错误")

if __name__ == '__main__':
    #basicLog()
    #withFormat()
    #save2File()
    consoleAndFile()