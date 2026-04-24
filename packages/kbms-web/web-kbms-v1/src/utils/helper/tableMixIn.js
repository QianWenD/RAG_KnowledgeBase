/*
 * updated by wuhiuhui on 2018/03/22
 * 1078093319@qq.com
 * -------------------------------------------------
 * 方法类:
 * 提供表格、表单相关常用方法处理
 * -------------------------------------------------
 * getDict         : 数据字典,表内筛选字典转化获取
 * selectionChange : 当表格中选择项发生变化时调用此方法赋值
 * get             ：获取表格数据
 * filterChange    ：表内筛选
 * selectionChange ：表格勾选项目发生变化时触发
 * filterHandler   ：element-ui表格列原生属性，数据过滤使用的方法
 * resetForm       ：对整个表单进行重置，将所有字段值重置为初始值并移除校验结果
 * insert          ：表格新增数据新增
 * edit            ：表格编辑方法
 * save            ：表格新增、编辑后保存
 * deleteOne       ：表格单条数据删除
 * batch           ：表格批量操作:批量删除、批量审核
 * remoteMethod    ：表格批量操作:批量删除、批量审核
 * importData      ：导入
 * exportData      ：导出
 */

/*
 * 工具类常用方法实现
 */
export const tableMixIn = {
  data() {
    return {
      timeout: null,
      // 动态数据获取接口
      api: {
        // 查询自有医保药品动态数据接口
        healthDrugList: kindo.api.kbms + 'base/drug/kbmsHealthCareDrug/listAll/',
        // 查询小剂型
        bigDosageList: kindo.api.kbms + 'base/drug/kbmsHealthCareDrug/listAll/',
        // 查询大剂型的数据接口
        smallDosageList: kindo.api.kbms + 'base/drug/kbmsHealthCareDrug/listAll/',
        // 查询自由药品目录的数据接口
        commonDrugList: kindo.api.kbms + 'base/drug/kbmsDrug/listAll/',
        // 中药饮片->新增->查询
        commonZyyp: kindo.api.kbms + 'adapter/kbmsCusHcCatalogue/listAll/1?rows=50',
        // 给药途径的数据接口
        dosingWayList: kindo.api.kbms + 'base/drug/kbmsDrugWay/listAll',
        // 给药途径的数据接口
        adaptList: kindo.api.kbms + 'base/drug/kbmsDrugIndication/listAll',
        // 查询医保限制条件
        // conditionList: kindo.api.kbms + 'rule/drug/kbmsRuleLimitCondition/listAll',
        conditionList: kindo.api.kbms + 'rule/drug/kbmsRuleLimitCondition/listForCombo',
        // 诊疗项目
        medicalTreatment: kindo.api.kbms + 'base/item/kbmsItem'
      }
    }
  },
  created() { },
  methods: {
    /*
     * 远程搜索框的清空下拉list
     * ev          ->   事件对象
     * form        ->   表单对象
     * filed       ->   表单的字段
     * gName        ->   下拉list包含的数组
     */
    blurSel(ev, form, filed, gName) {
      console.log(form)
      console.log(form[filed])
      console.log(this.list)
      setTimeout(() => {
        if (form[filed] === '') {
          this.list[gName] = []
        }
      }, 500)
    },
    /*
     * 数据字典获取
     * dict        ->   数据字典对象集
     * filtersDict ->   字典转换后表内筛选数据集[可选]
     */
    getDict(dict, filtersDict) {
      for (let k in dict) {
        if (dict.hasOwnProperty(k)) {
          kindo.dictionary
            .getDictionary(k)
            .then(res => {
              dict[k] = res || []
            })
            .then(() => {
              // 表内筛选数据字典字段名转换
              if (filtersDict && filtersDict.hasOwnProperty(k)) {
                for (let i = 0; i < dict[k].length; i++) {
                  filtersDict[k].push({
                    text: dict[k][i].label,
                    value: dict[k][i].value
                  })
                }
              }
            })
        }
      }
    },

    /*
     * 获取表格数据
     * tableName   ->   表格ref属性值
     */
    get(tableName) {
      this.$refs[tableName].reloadData()
    },
    /*
     * 获取表格数据
     * form   ->   表格ref属性值
     */
    reset(form) {
      this.$refs[form].resetFields()
    },
    /*
     * 表内筛选
     * filters  ->   表格筛选条件发生变化时方法自身传入数据对象
     * table    ->   表格ref属性值
     * search   ->   表格关联查询数据对象
     */
    filterChange(filters, table, search) {
      for (let k in filters) {
        if (filters.hasOwnProperty(k)) {
          this[search][k] = filters[k].toString()
        }
      }
      this.get(table)
    },

    /*
     * 表格勾选项目发生变化时触发
     * selection      ->   表格勾选框变化时方法自生传入数据对象
     * selectionData  ->   本地表格定义的已勾选数据集变量名称
     */
    selectionChange(selection, selectionData) {
      this[selectionData] = selection
    },

    /*
     * element-ui表格列原生属性，数据过滤使用的方法
     */
    filterHandler(value, row, column) {
      const property = column['property']
      if (row[property] !== undefined) {
        // 如果返回数组里不存在对象包裹的属性
        return row[property] === value
      } else {
        // 如果返回数组里面含有对象包裹的属性
        return row[column['property'].split('.')[0]][column['property'].split('.')[1]]
      }
    },

    /*
     * 对整个表单进行重置，将所有字段值重置为初始值并移除校验结果
     * formName     ->   需要重置的表单ref名称
     */
    resetForm(formName) {
      this.$refs[formName].resetFields()
    },

    /*
     * 表格新增数据新增
     * visible     ->   新增弹框是否显示变量
     * form        ->   新增操作的表单实体对象
     * fn          ->  函数
     */
    insert(visible, form, fn) {
      kindo.util
        .promise(() => {
          this[visible] = true
        })
        .then(() => {
          this.$refs[form].resetFields()
        })
        .then(() => {
          this[form] = Object.assign(this[form], this['_' + form])
        })
        .then(() => {
          if (!kindo.validate.isEmpty(fn)) {
            this[fn]()
          }
        })
    },

    /*
     * 表格编辑方法
     * row       ->   当前行的数据
     * form      ->   编辑操作的表单实体对象,form要和ref值一致
     * table     ->   进行编辑操作的表格refs属性值--准备废弃
     * visible   ->   编辑弹框是否显示变量
     * fn        ->  函数
     */
    edit(row, form, table, visible, fn) {
      kindo.util
        .promise(() => {
          this[visible] = true
        })
        .then(() => {
          // 初始化，去除校验提示并清空实体
          this.$refs[form].resetFields()
        })
        .then(() => {
          for (var key in row) {
            if (this[form].hasOwnProperty(key) === true) {
              this[form][key] = row[key]
            }
          }
        })
        .then(() => {
          if (!kindo.validate.isEmpty(fn)) {
            this[fn](row)
          }
        })
    },

    /*
     * 保存
     * form      ->   要保存数据的表单实体对象
     * table     ->   要保存数据的表格refs属性值
     * visible   ->   要保存数据的弹框是否显示变量
     * url       ->   要保存数据的url,如果传递这个url，就以这个url为准
     */
    save(form, table, visible, url) {
      this.$refs[form].validate(valid => {
        if (valid) {
          let mainUrl = this.$refs[table].url
          let requestType = 'post'
          // 若有id则为编辑保存
          if (this[form].id) {
            requestType = 'put'
          }
          if (!kindo.validate.isEmpty(url)) {
            mainUrl = url
          }
          this.$http[requestType](mainUrl, this[form]).then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this[visible] = false
            this.get(table)
          })
        }
      })
    },
    /*
     * 单条数据删除
     * id        ->   删除数据的id
     * table     ->   要保存数据的表格refs属性值
     * url       ->   要保存数据的url,如果传递这个url，就以这个url为准
     */
    deleteOne(id, table, url) {
      let mainUrl = this.$refs[table].url
      kindo.util.confirm('请确定删除', undefined, undefined, () => {
        if (!kindo.validate.isEmpty(url)) {
          mainUrl = url
        }
        this.$http
          .delete(mainUrl, {
            data: {
              ids: [id]
            }
          })
          .then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.get(table)
          })
      })
    },
    /*
     * 表格批量操作:批量删除、批量审核
     * selection   ->   本地定义的表格已勾选数据集
     * table       ->   批量操作对象表格的refs属性值
     * proType     ->   批量操作属性标识，是删除还是审核
     * url       ->   要保存数据的url,如果传递这个url，就以这个url为准
     */
    batch(selection, table, proType, url) {
      let prompt = ''
      let requestType = 'put'
      let urlType = ''
      let ids = this[selection].map(item => {
        return item.id
      })
      let mainUrl = this.$refs[table].url
      let params = {
        ids: ids
      }
      switch (proType) {
        case 'delete':
          prompt = '请确定是否批量删除 '
          requestType = 'delete'
          params = {
            data: {
              ids: ids
            }
          }
          break
        case 'audit':
          prompt = '请确定是否通过审核 '
          urlType = 'batchAudit'
          params = ids.map(item => {
            return {
              id: item
            }
          })
          break
        default:
          return
      }
      if (this[selection].length > 0) {
        kindo.util.confirm(prompt, undefined, undefined, () => {
          if (!kindo.validate.isEmpty(url)) {
            mainUrl = url
          }
          this.$http[requestType](mainUrl + urlType, params).then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.get(table)
          })
        })
      } else {
        kindo.util.alert('请至少勾选一条数据', '提示', 'warning')
      }
    },

    /*
     * select远程模糊搜索
     * query       ->   请求查询字符串
     * loading     ->   是否加载动效字段
     * list        ->   查询将推荐结果返回的数据集
     * extendparams->   查询其他的参数
     *        healthDrugList:自有医保目录-已审核状态
     *        commonDrugList:自有药品目录-已审核状态
     *        bigDosageList:大剂型的模糊查询
     *        smallDosageList:小剂型的模糊查询
     */
    remoteMethod(query, loading, list, extendparams) {
      if (query !== '') {
        this[loading] = true
        if (!kindo.validate.isEmpty(this.timeout)) {
          clearTimeout(this.timeout)
        }
        this.timeout = setTimeout(() => {
          let api = ''
          let params = {}
          switch (list) {
            case 'healthDrugList':
              api = this.api.healthDrugList
              params = {
                hcGenericName: query,
                status: '1'
              }
              break
            case 'commonDrugList':
              api = this.api.commonDrugList
              params = {
                hcGenericName: query,
                status: '1'
              }
              break
            case 'commonZyyp':
              api = this.api.commonZyyp
              params = {
                hcCatalogueName: query,
                status: '1'
              }
              break
            case 'dosingWayList':
              api = this.api.dosingWayList
              params = {
                name: query
              }
              break
            case 'adaptList':
              api = this.api.adaptList
              params = {
                name: query
              }
              break
            case 'firstCondtionList':
            case 'secondCondtionList':
            case 'thirdCondtionList':
            case 'fourthCondtionList':
            case 'fifthCondtionList':
              api = this.api.conditionList
              params = {
                limitName: query,
                limitDefine: '1'
              }
              break
            default:
              break
          }
          if (!kindo.validate.isEmpty(extendparams)) {
            Object.assign(params, extendparams)
          }
          this.$http
            .get(api, {
              params: params
            })
            .then(res => {
              this[loading] = false
              console.log('ok')
              console.log(res.data)
              if (res.data && res.data.length > 0) {
                let arr = res.data.map(item => {
                  let tempObj = {}
                  switch (list) {
                    case 'healthDrugList':
                      tempObj = {
                        label: item.hcGenericName,
                        value: item.hcDrugCode,
                        actualFormName: item.actualFormName,
                        reamrk: item.remark
                      }
                      break
                    case 'commonDrugList':
                      tempObj = {
                        label: item.genericName,
                        value: item.drugCode
                      }
                      break
                    case 'commonZyyp':
                      tempObj = {
                        label: item.hcCatalogueName,
                        value: item.hcCatalogueCode
                      }
                      break
                    case 'dosingWayList':
                      tempObj = {
                        label: item.name,
                        value: item.id
                      }
                      break
                    case 'adaptList':
                      tempObj = {
                        label: item.name,
                        value: item.id
                      }
                      break
                    case 'firstCondtionList':
                    case 'secondCondtionList':
                    case 'thirdCondtionList':
                    case 'fourthCondtionList':
                    case 'fifthCondtionList':
                      tempObj = {
                        label: item.label,
                        value: item.value
                      }
                      break
                    default:
                      break
                  }
                  return tempObj
                })
                this.list[list] = arr.filter(item => {
                  return item.label.toLowerCase().indexOf(query.toLowerCase()) > -1 || item.value.toLowerCase().indexOf(query.toLowerCase()) > -1
                })
              } else {
                this.list[list] = []
              }
            })
        }, 200)
      } else {
        this.list[list] = []
      }
    },

    // 导入
    importData() { },

    // 导出
    exportData(api) {
      window.open(kindo.util.exportUrl(api))
    }
  }
}

export default tableMixIn
