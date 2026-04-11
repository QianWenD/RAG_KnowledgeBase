# Milvus 本机可行性报告

更新时间：2026-04-09

## 结论

当前这台机器**可以走本机部署 Milvus 的路线**，但前提是补上 `Docker Desktop`。
它**不适合走“原生 Windows 直接安装 Milvus 服务端”**这条路，因为官方 Windows 路线本质上是 `Docker Desktop + WSL2`。

另外，这台机器已经有 `WSL Ubuntu 24.04`，因此还存在一条轻量路线：

- **在 WSL Ubuntu 中安装并运行 `Milvus Lite`**

这条路不属于“Windows 原生安装”，但对于本机开发验证是可行的。

对这台机器的判断是：

- 已具备 `WSL2`
- 已具备 Ubuntu Linux 环境
- 已开启虚拟化/Hypervisor
- 内存和磁盘空间足够做 `Milvus Standalone` 本地开发
- 当前阻塞点只有：**没有安装 Docker**

因此，**本机方案可行，但应按 Docker 路线走；如果你更看重稳定性和后续长期运行，Linux 服务器仍然是更优解。**

## 本机实测结果

- Windows：`Microsoft Windows 10 专业版` `10.0.19045` `64 位`
- WSL：已安装，默认发行版为 `Ubuntu`
- WSL 版本：`WSL2`
- WSL Linux：`Ubuntu 24.04.1 LTS`
- Docker：当前未安装
- 物理内存：约 `31.78 GB`
- 逻辑处理器：`20`
- C 盘可用空间：约 `43.38 GB`
- WSL 根分区可用空间：约 `955 GB`

## 官方安装路径判断

### 1. 原生 Windows 服务端

不建议按这个方向规划。
Milvus 官方文档提供的 Windows 方案是 **“用 Docker Desktop 在 Windows 上运行 Milvus”**，不是提供一个原生 Windows 服务端安装包。

### 2. 本机开发推荐路线

官方意义上更合适的本机路线是：

1. 安装 `WSL2`
2. 安装 `Docker Desktop`
3. 开启 Docker 对 WSL 的集成
4. 按官方 `Milvus Standalone` 文档在 Docker 中运行 Milvus

你这台机器第 1 和第 3 步的底座已经基本具备了，缺的是第 2 步。

### 3. Milvus Lite

Milvus Lite 更适合做轻量开发验证，但官方支持平台是 `Ubuntu` 和 `macOS`，**不包含 Windows**。
这也解释了为什么当前 Windows Python 环境里不适合把它当作正式本机方案。

不过因为你当前已经安装了 `WSL Ubuntu 24.04`，所以：

- **Windows Python 环境**：不适合直接装 Milvus Lite
- **WSL Ubuntu Python 环境**：可以作为 Milvus Lite 的本地开发环境

当前 WSL 中已确认：

- `Python 3.12.3` 已存在
- 已补 `pip`
- 已成功安装并验证 `pymilvus[milvus-lite]`
- 当前兼容性注意事项：需要将 `setuptools` 固定在 `<81`

## 需要安装的东西

如果走本机路线，最少需要补这些：

- `Docker Desktop for Windows`
- Docker 的 `WSL2 backend`
- Docker 对 `Ubuntu` 的 WSL integration
- 按官方文档拉起 `Milvus Standalone`

如果走轻量本机验证路线，还可以补这些：

- 在 `WSL Ubuntu` 中安装 `python3-pip`
- 在 `WSL Ubuntu` 中安装 `pymilvus[milvus-lite]`
- 把当前项目切到 WSL 内运行，或单独在 WSL 内做 Lite 验证

如果走服务器路线，建议直接选：

- `Ubuntu 22.04` 或 `Ubuntu 24.04`
- `Docker Engine + Docker Compose` 做单机部署
- 如果后续要高可用/更大规模，再升级到 `Kubernetes + Helm`

## 我对本机路线的建议

如果你的目标是：

- 先把项目完整跑起来
- 先做功能联调
- 机器主要是个人开发机

那么建议先走：

**本机 Windows + Docker Desktop + WSL2 + Milvus Standalone**

因为你当前机器条件已经基本够了，只差 Docker。

## 我对服务器路线的建议

如果你的目标是：

- 希望环境更稳定
- 后续长期运行
- 想避免 Windows / Docker Desktop / WSL 的兼容细节

那么建议直接买一台 Linux 服务器，优先选：

- `Ubuntu 22.04/24.04`
- `4-8 vCPU`
- `16-32 GB RAM`
- `100 GB+ SSD`

这会比 Windows 本机长期维护更省心。

## 下一步建议

### 方案 A：继续本机部署

下一步执行：

1. 安装 `Docker Desktop`
2. 打开 WSL integration
3. 运行 Milvus Standalone
4. 把当前项目从 `local vector store` 切回 `Milvus`

### 方案 A-2：先做轻量验证

下一步执行：

1. 在 `WSL Ubuntu` 中安装 `python3-pip`
2. 安装 `pymilvus[milvus-lite]`
3. 如果遇到 `pkg_resources` 问题，将 `setuptools` 固定为 `<81`
4. 在 WSL 里做最小检索验证
5. 如果效果和接口都满意，再升级到正式 Milvus

当前这一步已经在本机完成，详情见：

- `docs/milvus-lite-wsl-setup.md`

### 方案 B：直接上服务器

下一步执行：

1. 购买 Ubuntu 服务器
2. 部署 Docker
3. 部署 Milvus Standalone
4. 把当前项目 API 指向服务器上的 Milvus

## 参考来源

- [Install Milvus Standalone with Docker Desktop on Windows](https://milvus.io/docs/install_standalone-windows.md)
- [Milvus Docker prerequisites](https://milvus.io/docs/prerequisite-docker.md)
- [Milvus Lite](https://milvus.io/docs/milvus_lite.md)
- [Milvus installation overview](https://milvus.io/docs/install-overview.md)
