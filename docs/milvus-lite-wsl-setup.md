# WSL 中安装 Milvus Lite 记录

更新时间：2026-04-09

## 结果

当前这台机器已经在 `WSL Ubuntu 24.04.1` 中成功跑通 `Milvus Lite` 最小验证。

验证结果包括：

- 成功创建本地数据库文件：`/root/milvus-lite-demo.db`
- 成功创建 collection
- 成功插入 `2` 条向量数据
- 成功执行 search
- top hit 正常返回

## 当前使用的环境

- WSL：`Ubuntu 24.04.1 LTS`
- Python：`3.12.3`
- 虚拟环境：`/root/milvus-lite-env`
- `pymilvus`：`2.6.11`
- `milvus-lite`：`2.5.1`

## 关键兼容点

这次实测发现一个重要问题：

- 直接安装最新 `setuptools` 时，`milvus-lite` 会因为找不到 `pkg_resources` 而初始化失败

因此当前可用组合是：

```bash
pip install "setuptools<81"
pip install -U "pymilvus[milvus-lite]"
```

如果不回退 `setuptools`，会报类似错误：

```text
ModuleNotFoundError: No module named 'pkg_resources'
```

## 本次实际执行步骤

```bash
apt-get update
apt-get install -y python3-pip python3-venv
python3 -m venv /root/milvus-lite-env
source /root/milvus-lite-env/bin/activate
pip install "setuptools<81"
pip install -U "pymilvus[milvus-lite]"
```

## 最小验证脚本示例

```python
from pathlib import Path
from pymilvus import MilvusClient

db_path = Path("/root/milvus-lite-demo.db")
if db_path.exists():
    db_path.unlink()

client = MilvusClient(str(db_path))
collection_name = "demo_collection"

if client.has_collection(collection_name=collection_name):
    client.drop_collection(collection_name=collection_name)

client.create_collection(collection_name=collection_name, dimension=4)

rows = [
    {"id": 1, "vector": [0.1, 0.2, 0.3, 0.4], "text": "milvus lite demo one"},
    {"id": 2, "vector": [0.11, 0.19, 0.29, 0.41], "text": "milvus lite demo two"},
]

client.insert(collection_name=collection_name, data=rows)

result = client.search(
    collection_name=collection_name,
    data=[[0.1, 0.2, 0.3, 0.39]],
    limit=2,
    output_fields=["text"],
)

print(result)
```

## 适用建议

这条路线适合：

- 先做本机轻量验证
- 验证检索逻辑和 PyMilvus API
- 在没装 Docker Desktop 之前先确认 Milvus 方案能否工作

这条路线不等于正式 Milvus 服务端部署。
如果后面你要接近生产环境，仍然建议升级到：

- `Docker Desktop + Milvus Standalone`
- 或 Linux 服务器上的正式 Milvus
