export default {
  api: {
    // 获取用户列表
    get: kindo.api.upms + 'system/user/query',
    // 通过id获取用户信息
    getById: kindo.api.upms + 'system/user/querySingle',
    // 获取数据字典分类
    getStatus: kindo.api.upms + 'system/dict/get?catalog=USER_STATUS',
    // 获取组织机构树
    orgaTree: kindo.api.upms + 'system/orga/tree',
    // 新增用户
    insert: kindo.api.upms + 'system/user/insert',
    // 编辑用户
    update: kindo.api.upms + 'system/user/update',
    // 删除用户
    delete: kindo.api.upms + 'system/user/delete',
    // 批量删除用户
    deleteBatch: kindo.api.upms + 'system/user/deleteBatch',
    // 获取菜单角色
    getMenuRole: kindo.api.upms + 'system/menuRole/queryAll',

    // 查询用户菜单角色
    getMenuRoleById: kindo.api.upms + 'system/user/queryMenuRoles',

    // 设置用户菜单角色
    updateMenuRole: kindo.api.upms + 'system/user/setupMenuRoles',

    // 管理员重置密码
    reset: kindo.api.upms + 'system/user/resetPwd',

    // 管理员修改密码
    updatePwd: kindo.api.upms + 'system/user/updatePwd'
  },
  mock: {
    // get: {
    //   code: 200,
    //   message: '成功',
    //   data: [
    //     {}, {}
    //   ]
    // }
  }
}
