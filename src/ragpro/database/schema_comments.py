from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Iterable

_IDENTIFIER_PATTERN = re.compile(r"^[A-Za-z0-9_]+$")


@dataclass(frozen=True)
class ColumnCommentSpec:
    name: str
    definition: str
    comment: str


@dataclass(frozen=True)
class TableCommentSpec:
    table: str
    comment: str
    columns: tuple[ColumnCommentSpec, ...]


RAGPRO_SCHEMA_COMMENTS: tuple[TableCommentSpec, ...] = (
    TableCommentSpec(
        table="users",
        comment="系统用户表，保存登录账号、角色、授权知识源和组织信息",
        columns=(
            ColumnCommentSpec("id", "INT NOT NULL AUTO_INCREMENT", "用户主键ID"),
            ColumnCommentSpec("username", "VARCHAR(64) NOT NULL", "登录账号，系统内唯一"),
            ColumnCommentSpec("password_hash", "VARCHAR(255) NOT NULL", "登录密码哈希值"),
            ColumnCommentSpec("role", "VARCHAR(20) NOT NULL DEFAULT 'user'", "账号角色，admin为管理员，user为普通用户"),
            ColumnCommentSpec("allowed_sources", "TEXT NOT NULL", "允许访问的知识源列表，JSON数组字符串"),
            ColumnCommentSpec("is_active", "TINYINT(1) NOT NULL DEFAULT 1", "账号是否启用，1启用，0停用"),
            ColumnCommentSpec("display_name", "VARCHAR(64) NULL", "用户展示名称"),
            ColumnCommentSpec("work_no", "VARCHAR(64) NULL", "工号或外部人员编号"),
            ColumnCommentSpec("org_unit_id", "INT NULL", "所属组织机构ID，对应auth_org_units.id"),
            ColumnCommentSpec("created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP", "账号创建时间"),
            ColumnCommentSpec(
                "updated_at",
                "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
                "账号最近更新时间",
            ),
        ),
    ),
    TableCommentSpec(
        table="auth_sessions",
        comment="登录会话表，保存用户会话令牌哈希和过期时间",
        columns=(
            ColumnCommentSpec("id", "INT NOT NULL AUTO_INCREMENT", "会话主键ID"),
            ColumnCommentSpec("user_id", "INT NOT NULL", "所属用户ID，对应users.id"),
            ColumnCommentSpec("token_hash", "CHAR(64) NOT NULL", "会话令牌SHA256哈希值"),
            ColumnCommentSpec("expires_at", "DATETIME NOT NULL", "会话过期时间"),
            ColumnCommentSpec("created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP", "会话创建时间"),
            ColumnCommentSpec("last_seen_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP", "最近访问时间"),
        ),
    ),
    TableCommentSpec(
        table="auth_audit_logs",
        comment="权限审计日志表，记录用户、权限、菜单等管理操作",
        columns=(
            ColumnCommentSpec("id", "INT NOT NULL AUTO_INCREMENT", "审计日志主键ID"),
            ColumnCommentSpec("action", "VARCHAR(64) NOT NULL", "操作类型编码"),
            ColumnCommentSpec("actor_user_id", "INT NULL", "操作者用户ID"),
            ColumnCommentSpec("actor_username", "VARCHAR(64) NULL", "操作者账号"),
            ColumnCommentSpec("actor_role", "VARCHAR(20) NULL", "操作者角色"),
            ColumnCommentSpec("target_user_id", "INT NULL", "被操作用户ID"),
            ColumnCommentSpec("target_username", "VARCHAR(64) NULL", "被操作用户账号"),
            ColumnCommentSpec("target_role", "VARCHAR(20) NULL", "被操作用户角色"),
            ColumnCommentSpec("metadata_json", "TEXT NULL", "操作附加信息，JSON字符串"),
            ColumnCommentSpec("created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP", "审计记录创建时间"),
        ),
    ),
    TableCommentSpec(
        table="auth_org_units",
        comment="组织机构表，维护平台内部门、团队等组织节点",
        columns=(
            ColumnCommentSpec("id", "INT NOT NULL AUTO_INCREMENT", "组织机构主键ID"),
            ColumnCommentSpec("parent_id", "INT NULL", "上级组织机构ID"),
            ColumnCommentSpec("org_code", "VARCHAR(64) NOT NULL", "组织编码，系统内唯一"),
            ColumnCommentSpec("org_name", "VARCHAR(128) NOT NULL", "组织名称"),
            ColumnCommentSpec("org_type", "VARCHAR(32) NOT NULL DEFAULT 'department'", "组织类型"),
            ColumnCommentSpec("org_desc", "VARCHAR(255) NULL", "组织说明"),
            ColumnCommentSpec("sort_order", "INT NOT NULL DEFAULT 100", "排序号，数值越小越靠前"),
            ColumnCommentSpec("created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP", "组织创建时间"),
            ColumnCommentSpec(
                "updated_at",
                "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
                "组织最近更新时间",
            ),
        ),
    ),
    TableCommentSpec(
        table="auth_menu_items",
        comment="菜单资源表，维护后台菜单、页面入口和权限资源",
        columns=(
            ColumnCommentSpec("id", "INT NOT NULL AUTO_INCREMENT", "菜单资源主键ID"),
            ColumnCommentSpec("parent_id", "INT NULL", "父级菜单资源ID"),
            ColumnCommentSpec("menu_code", "VARCHAR(64) NOT NULL", "菜单编码，系统内唯一"),
            ColumnCommentSpec("name", "VARCHAR(128) NOT NULL", "菜单显示名称"),
            ColumnCommentSpec("router_name", "VARCHAR(64) NULL", "前端路由名称"),
            ColumnCommentSpec("router_path", "VARCHAR(255) NULL", "前端路由路径"),
            ColumnCommentSpec("icon_url", "VARCHAR(255) NULL", "菜单图标地址或标识"),
            ColumnCommentSpec("href", "VARCHAR(255) NULL", "菜单跳转链接"),
            ColumnCommentSpec("is_visible", "TINYINT(1) NOT NULL DEFAULT 1", "是否在菜单中显示，1显示，0隐藏"),
            ColumnCommentSpec("remark", "VARCHAR(255) NULL", "菜单备注"),
            ColumnCommentSpec("sort_order", "INT NOT NULL DEFAULT 100", "排序号，数值越小越靠前"),
            ColumnCommentSpec("created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP", "菜单创建时间"),
            ColumnCommentSpec(
                "updated_at",
                "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
                "菜单最近更新时间",
            ),
        ),
    ),
    TableCommentSpec(
        table="auth_menu_roles",
        comment="菜单角色表，维护菜单权限角色",
        columns=(
            ColumnCommentSpec("id", "INT NOT NULL AUTO_INCREMENT", "菜单角色主键ID"),
            ColumnCommentSpec("role_code", "VARCHAR(64) NOT NULL", "菜单角色编码，系统内唯一"),
            ColumnCommentSpec("role_name", "VARCHAR(64) NOT NULL", "菜单角色名称，系统内唯一"),
            ColumnCommentSpec("role_desc", "VARCHAR(255) NULL", "菜单角色说明"),
            ColumnCommentSpec("created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP", "角色创建时间"),
            ColumnCommentSpec(
                "updated_at",
                "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
                "角色最近更新时间",
            ),
        ),
    ),
    TableCommentSpec(
        table="auth_user_menu_roles",
        comment="用户菜单角色关联表，记录用户拥有的菜单角色",
        columns=(
            ColumnCommentSpec("id", "INT NOT NULL AUTO_INCREMENT", "关联主键ID"),
            ColumnCommentSpec("user_id", "INT NOT NULL", "用户ID，对应users.id"),
            ColumnCommentSpec("menu_role_id", "INT NOT NULL", "菜单角色ID，对应auth_menu_roles.id"),
            ColumnCommentSpec("created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP", "关联创建时间"),
        ),
    ),
    TableCommentSpec(
        table="auth_menu_role_items",
        comment="菜单角色资源关联表，记录角色可访问的菜单资源",
        columns=(
            ColumnCommentSpec("id", "INT NOT NULL AUTO_INCREMENT", "关联主键ID"),
            ColumnCommentSpec("menu_role_id", "INT NOT NULL", "菜单角色ID，对应auth_menu_roles.id"),
            ColumnCommentSpec("menu_item_id", "INT NOT NULL", "菜单资源ID，对应auth_menu_items.id"),
            ColumnCommentSpec("created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP", "关联创建时间"),
        ),
    ),
    TableCommentSpec(
        table="knowledge_sources",
        comment="知识源目录表，维护来源编码、显示名称和启停状态",
        columns=(
            ColumnCommentSpec("id", "INT NOT NULL AUTO_INCREMENT", "知识源主键ID"),
            ColumnCommentSpec("source_code", "VARCHAR(50) NOT NULL", "知识源编码，权限、上传、检索统一使用该稳定编码"),
            ColumnCommentSpec("display_name", "VARCHAR(100) NOT NULL", "知识源展示名称，可用于前端中文显示"),
            ColumnCommentSpec("description", "VARCHAR(255) NULL", "知识源说明"),
            ColumnCommentSpec("is_active", "TINYINT(1) NOT NULL DEFAULT 1", "知识源是否启用，1启用，0停用"),
            ColumnCommentSpec("sort_order", "INT NOT NULL DEFAULT 100", "排序号，数值越小越靠前"),
            ColumnCommentSpec("created_by", "INT NULL", "创建人用户ID，对应users.id"),
            ColumnCommentSpec("created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP", "知识源创建时间"),
            ColumnCommentSpec(
                "updated_at",
                "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
                "知识源最近更新时间",
            ),
        ),
    ),
    TableCommentSpec(
        table="jpkb",
        comment="FAQ知识问答表，保存传统问答库中的标准问题和答案",
        columns=(
            ColumnCommentSpec("id", "INT NOT NULL AUTO_INCREMENT", "FAQ主键ID"),
            ColumnCommentSpec("subject_name", "VARCHAR(50) NULL", "学科或知识源名称"),
            ColumnCommentSpec("question", "VARCHAR(1000) NOT NULL", "标准问题文本"),
            ColumnCommentSpec("answer", "VARCHAR(2000) NOT NULL", "标准答案文本"),
        ),
    ),
    TableCommentSpec(
        table="conversations",
        comment="问答会话记录表，保存用户最近对话历史用于上下文续问",
        columns=(
            ColumnCommentSpec("id", "INT NOT NULL AUTO_INCREMENT", "会话记录主键ID"),
            ColumnCommentSpec("session_id", "VARCHAR(64) NOT NULL", "前端会话ID"),
            ColumnCommentSpec("user_id", "INT NULL", "所属用户ID，对应users.id，可为空兼容历史数据"),
            ColumnCommentSpec("question", "TEXT NOT NULL", "用户问题原文"),
            ColumnCommentSpec("answer", "MEDIUMTEXT NOT NULL", "系统回答内容"),
            ColumnCommentSpec("timestamp", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP", "问答记录创建时间"),
        ),
    ),
)


def specs_for_tables(*table_names: str) -> tuple[TableCommentSpec, ...]:
    wanted = set(table_names)
    return tuple(spec for spec in RAGPRO_SCHEMA_COMMENTS if spec.table in wanted)


def apply_schema_comments(cursor, specs: Iterable[TableCommentSpec] = RAGPRO_SCHEMA_COMMENTS) -> int:
    changed = 0
    for spec in specs:
        current_table_comment = _fetch_table_comment(cursor, spec.table)
        if current_table_comment is None:
            continue
        if current_table_comment != spec.comment:
            cursor.execute(build_table_comment_sql(spec))
            changed += 1

        current_column_comments = _fetch_column_comments(cursor, spec.table)
        for column in spec.columns:
            if column.name not in current_column_comments:
                continue
            if current_column_comments[column.name] != column.comment:
                cursor.execute(build_column_comment_sql(spec.table, column))
                changed += 1
    return changed


def build_table_comment_sql(spec: TableCommentSpec) -> str:
    return f"ALTER TABLE {_quote_identifier(spec.table)} COMMENT = {_quote_string(spec.comment)}"


def build_column_comment_sql(table_name: str, column: ColumnCommentSpec) -> str:
    return (
        f"ALTER TABLE {_quote_identifier(table_name)} "
        f"MODIFY COLUMN {_quote_identifier(column.name)} {column.definition} "
        f"COMMENT {_quote_string(column.comment)}"
    )


def _fetch_table_comment(cursor, table_name: str) -> str | None:
    cursor.execute(
        """
        SELECT TABLE_COMMENT AS table_comment
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = %s
        """,
        (table_name,),
    )
    row = cursor.fetchone()
    if row is None:
        return None
    value = _row_value(row, "table_comment", 0)
    return "" if value is None else str(value)


def _fetch_column_comments(cursor, table_name: str) -> dict[str, str]:
    cursor.execute(
        """
        SELECT COLUMN_NAME AS column_name, COLUMN_COMMENT AS column_comment
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = %s
        """,
        (table_name,),
    )
    comments: dict[str, str] = {}
    for row in cursor.fetchall():
        name = _row_value(row, "column_name", 0)
        if not name:
            continue
        value = _row_value(row, "column_comment", 1)
        comments[str(name)] = "" if value is None else str(value)
    return comments


def _quote_identifier(value: str) -> str:
    if not _IDENTIFIER_PATTERN.fullmatch(value):
        raise ValueError(f"Unsafe MySQL identifier: {value}")
    return f"`{value}`"


def _quote_string(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace("'", "''")
    return f"'{escaped}'"


def _row_value(row, key: str, index: int):
    if isinstance(row, dict):
        return row.get(key) or row.get(key.upper())
    return row[index]
