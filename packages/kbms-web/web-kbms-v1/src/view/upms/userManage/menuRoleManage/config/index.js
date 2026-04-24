export default {
  api: {

    // 菜单树查询
    getMenu: kindo.api.upms + 'system/menu/tree',

    // 菜单角色表信息获取
    get: kindo.api.upms + 'system/menuRole/query',

    // 通过ID获取用户信息
    getRoleUser: kindo.api.upms + 'system/menuRole/querySingle',

    // 新增角色
    insert: kindo.api.upms + 'system/menuRole/insert',

    // 编辑角色
    update: kindo.api.upms + 'system/menuRole/update',

    // 删除角色
    delete: kindo.api.upms + 'system/menuRole/delete',

    // 查询菜单角色的菜单权限
    getMenuRole: kindo.api.upms + 'system/menuRole/queryAuths',

    // 修改菜单角色的菜单权限
    updateMenuRole: kindo.api.upms + 'system/menuRole/setupAuths'
  },
  mock: {}
}
