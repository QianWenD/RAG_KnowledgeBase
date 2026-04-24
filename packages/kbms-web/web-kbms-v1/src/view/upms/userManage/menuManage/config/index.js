export default {
  api: {
    // 获取菜单树
    get: kindo.api.upms + 'system/menu/tree',

    // 带查询条件获取菜单树
    getData: kindo.api.upms + 'system/menu/query',

    // 根据ID获取菜单详情
    getById: kindo.api.upms + 'system/menu/querySingle',

    // 新增菜单
    insert: kindo.api.upms + 'system/menu/insert',

    // 修改菜单
    update: kindo.api.upms + 'system/menu/update',

    // 删除菜单
    delete: kindo.api.upms + 'system/menu/delete'
  },
  mock: {}
}
