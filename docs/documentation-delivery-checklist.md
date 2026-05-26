# RAGPro 文档交付检查清单

## 当前结论

文档整理已经达到“可内部交接、可客户初步讲解”的状态。项目结构、运行方式、发布检查、客户使用说明和客户讲解 PPT 都已有入口。

还没有完全收口的是客户现场信息：生产访问地址、正式管理员账号交接方式、客户 Logo/截图、真实业务资料验收记录。这些需要等部署环境和客户资料最终确定后补齐。

## 已完成

| 类型 | 文档 | 状态 |
| --- | --- | --- |
| 项目入口 | `README.md` | 已完成 |
| 项目总览 | `PROJECT_MAP.md` | 已完成 |
| 文档索引 | `docs/README.md` | 已完成 |
| 文件盘点 | `docs/project-file-inventory.md` | 已完成 |
| 项目管理 | `docs/project-owner-handbook.md` | 已完成 |
| 后续计划 | `docs/project-roadmap.md` | 已完成 |
| 仓库清理 | `docs/repository-cleanup-plan.md` | 已完成 |
| 启动运维 | `docs/local-startup-runbook.md` | 已完成 |
| 上线部署 | `docs/production-deployment-guide.md` | 已完成 |
| 发布检查 | `scripts/release-check.ps1`、`scripts/README.md` | 已完成 |
| 客户说明 | `docs/customer-user-guide.md` | 已完成 |
| 客户讲解 | `docs/customer-presentation.md`、`docs/customer-presentation.pptx` | 已完成 |

## 已验证

- `docs/customer-presentation.pptx` 当前为 12 页。
- PPT 内部文本可正常读取中文，没有出现整块 `?` 的乱码块。
- 本地完整发布检查已通过：健康检查、Python 单测、前端 E2E、业务评测。
- 默认业务评测 `current_domain_regression.json` 已达到 `10/10` 通过。

## 交付前还要补

1. 生产环境访问地址、部署机器和最终端口。
2. 正式管理员账号的交接方式，不要写明文密码。
3. 客户真实资料上传后的验收记录。
4. 客户侧截图或 Logo，如果需要更正式的演示材料。
5. 生产备份路径、日志路径、重启方式和负责人联系方式。

## 判断标准

如果只是给客户做功能讲解，现在的 `customer-user-guide.md` 和 `customer-presentation.pptx` 已经可以使用。

如果是正式上线交付，还需要补齐“交付前还要补”的现场信息。这个部分不能提前虚构，必须等真实部署环境确认后再写。
