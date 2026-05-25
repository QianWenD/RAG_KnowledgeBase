# worker 目录说明

`apps/worker/` 放离线任务脚本。这里的脚本不直接提供 Web 页面，但会影响知识库数据、向量索引和 RAG 评测。

## 当前脚本

| 文件 | 作用 |
| --- | --- |
| `index_documents.py` | 从目录读取文档并写入向量库 |
| `faq_import.py` | 导入 FAQ 数据 |
| `run_evaluation.py` | 运行 RAG 离线评测 |

## 常用评测命令

```powershell
.venv\Scripts\python apps\worker\run_evaluation.py --dataset packages\data\evaluation\phase_one_smoke.json --mode app
.venv\Scripts\python apps\worker\run_evaluation.py --dataset packages\data\evaluation\phase_one_regression.json --mode app
.venv\Scripts\python apps\worker\run_evaluation.py --dataset packages\data\evaluation\current_domain_regression.json --mode app
```

## 评测数据覆盖

- `general`
- `faq`
- `rag`
- `source_filter`
- `conversation`
- `fallback`

新增业务域时，可以复制这个模板：

- `packages/data/evaluation/domain_regression_template.json`

然后替换里面的 query、source、期望 FAQ、引用片段和答案片段。通常不需要改 worker 代码。

当前项目已有较完整的参考评测集：

- `packages/data/evaluation/current_domain_regression.json`

注意：当前 `/query` 已要求登录，`run_evaluation.py` 还需要适配认证后才能作为正式发布门禁使用。
