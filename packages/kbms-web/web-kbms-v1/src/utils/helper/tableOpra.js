export const tableOpra = {
  data() {
    return {
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
        // 给药途径的数据接口
        dosingWayList: kindo.api.kbms + 'base/drug/kbmsDrugWay/listAll',
        // 给药途径的数据接口
        adaptList: kindo.api.kbms + 'base/drug/kbmsDrugIndication/listAll',
        // 查询医保限制条件
        conditionList: kindo.api.kbms + 'rule/drug/kbmsRuleLimitCondition/listAll',
        // 诊疗项目
        medicalTreatment: kindo.api.kbms + 'base/item/kbmsItem',
        // 药品
        medicalList: kindo.api.kbms + 'base/drug/kbmsHealthCareDrug'
      }
    }
  },
  methods: {
    /*
     * 远程搜索框的清空下拉list
     * ev          ->   事件对象
     * form        ->   表单对象
     * filed       ->   表单的字段
     * gName        ->   下拉list包含的数组
     */
    blurSel(ev, form, filed, gName) {
      setTimeout(() => {
        if (form[filed] === '') {
          this.list[gName] = []
        }
      }, 500)
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
          search[k] = filters[k].toString()
        }
      }
      this.getTable(table)
    },

    // 表格列数据过滤, 数组格式转换 text 和 value
    columnFilters(data, attrName) {
      let newData = []
      for (let i in data) {
        newData.push({
          text: data[i].label,
          value: data[i].value
        })
      }
      return newData
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
    // 获取静态数据字典
    getDictionary() {
      for (let k in this.dict) {
        if (this.dict.hasOwnProperty(k)) {
          kindo.dictionary.getDictionary(k).then(res => {
            this.dict[k] = res || []
          })
        }
      }
    },
    // 查询
    getTable(table) {
      this.$refs[table].reloadData()
    },
    tableChange(table, selection) {
      this[table].selection = selection
    },

    /**
     * 新增
     * @param {table}  传相应表的名称
     * @param {joinId} 传对不需要进行清空的字段，多个以逗号分隔。例： 'filed1,filed2'
     */
    add(table, joinId, refForm) {
      kindo.util
        .promise(() => {
          if (this[table].dialog.hasOwnProperty('title')) {
            this[table].dialog.title = '新增'
          }
          this[table].dialog.visible = true
        })
        .then(() => {
          if (refForm) {
            this.$refs[refForm].resetFields()
          } else {
            return true
          }
        })
        .then(() => {
          if (joinId) {
            let theJoinId = joinId.split(',')
            for (let k in this[table].form) {
              for (let i in theJoinId) {
                if (theJoinId[i] !== k) {
                  this[table].form[k] = ''
                } else {
                  return
                }
              }
            }
          } else {
            for (let k in this[table].form) {
              this[table].form[k] = ''
            }
          }
        })
    },
    // 修改
    update(table, id, fn, refForm) {
      kindo.util
        .promise(() => {
          if (table) {
            this[table].dialog.visible = true
          } else {
            this.dialog.visible = true
          }
        })
        .then(() => {
          if (refForm) {
            this.$refs[refForm].resetFields()
          } else {
            return true
          }
        })
        .then(() => {
          if (table) {
            this.$http
              .get(this[table].url + '/getById', {
                params: {
                  id: id
                }
              })
              .then(res => {
                let data = res.data
                for (let k in this[table].form) {
                  this[table].form[k] = data[k]
                }
              })
            if (!kindo.validate.isEmpty(fn)) {
              this[fn]()
            }
            if (this[table].dialog.hasOwnProperty('title')) {
              this[table].dialog.title = '编辑'
            }
          } else {
            this.$http
              .get(this.url + '/getById', {
                params: {
                  id: id
                }
              })
              .then(res => {
                let data = res.data
                for (let k in this.form) {
                  this.form[k] = data[k]
                }
              })
            if (!kindo.validate.isEmpty(fn)) {
              this[fn]()
            }
            if (this.dialog.hasOwnProperty('title')) {
              this.dialog.title = '修改'
            }
          }
        })
    },

    // 复制
    copy(table, id, fn, refForm) {
      kindo.util
        .promise(() => {
          if (table) {
            this[table].dialog.visible = true
          } else {
            this.dialog.visible = true
          }
        })
        .then(() => {
          if (refForm) {
            this.$refs[refForm].resetFields()
          } else {
            return true
          }
        })
        .then(() => {
          if (table) {
            this.$http
              .get(this[table].url + '/getById', {
                params: {
                  id: id
                }
              })
              .then(res => {
                let data = res.data
                for (let k in this[table].form) {
                  if (id !== data[k]) {
                    this[table].form[k] = data[k]
                  }
                }
              })
            if (!kindo.validate.isEmpty(fn)) {
              this[fn]()
            }
            if (this[table].dialog.hasOwnProperty('title')) {
              this[table].dialog.title = '复制'
            }
          } else {
            this.$http
              .get(this.url + '/getById', {
                params: {
                  id: id
                }
              })
              .then(res => {
                let data = res.data
                for (let k in this.form) {
                  if (id !== data[k]) {
                    this.form[k] = data[k]
                  }
                }
              })
            if (!kindo.validate.isEmpty(fn)) {
              this[fn]()
            }
            if (this.dialog.hasOwnProperty('title')) {
              this.dialog.title = '复制'
            }
          }
        })
    },

    // 保存
    save(table) {
      this.$refs[table + 'Form'].validate(valid => {
        if (valid) {
          if (this[table].form.id) {
            this.$http.put(this[table].url, Object.assign({}, this[table].form, this[table].splicingForm)).then(res => {
              kindo.util.alert(res.message, '提示', 'success')
              this[table].dialog.visible = false
              this.getTable(table)
            })
          } else {
            this.$http.post(this[table].url, Object.assign({}, this[table].form, this[table].splicingForm)).then(res => {
              kindo.util.alert(res.message, '提示', 'success')
              this[table].dialog.visible = false
              this.getTable(table)
            })
          }
        }
      })
    },
    // 删除
    remove(table, id) {
      // 单条
      if (id) {
        let ids = [id]
        kindo.util.confirm('请确定是否删除', undefined, undefined, () => {
          this.$http
            .delete(this[table].url, {
              data: {
                ids: ids
              }
            })
            .then(res => {
              kindo.util.alert(res.message, '提示', 'success')
              this.getTable(table)
            })
        })
      } else {
        // 多条
        let ids = []
        let data = this[table].selection
        if (data.length < 1) {
          kindo.util.alert('请选择一项进行操作。', '提示', 'warning')
        } else {
          for (let item of data) {
            ids.push(item.id)
          }
          kindo.util.confirm('请确定是否删除', undefined, undefined, () => {
            this.$http
              .delete(this[table].url, {
                data: {
                  ids: ids
                }
              })
              .then(res => {
                kindo.util.alert(res.message, '提示', 'success')
                this.getTable(table)
              })
          })
        }
      }
    },

    // 审核
    audit(table, id) {
      if (id) {
        // 单条
        let ids = [{ id: id }]
        kindo.util.confirm('请确定是否审核', undefined, undefined, () => {
          this.$http.put(this[table].url + '/batchAudit', ids).then(res => {
            kindo.util.alert(res.message, '提示', 'success')
            this.getTable(table)
          })
        })
      } else {
        // 多条
        let ids = []
        let data = this[table].selection
        if (data.length < 1) {
          kindo.util.alert('请选择一项进行操作。', '提示', 'warning')
        } else {
          for (let item of data) {
            ids.push({
              id: item.id
            })
          }
          kindo.util.confirm('请确定是否审核', undefined, undefined, () => {
            this.$http.put(this[table].url + '/batchAudit', ids).then(res => {
              kindo.util.alert(res.message, '提示', 'success')
              this.getTable(table)
            })
          })
        }
      }
    }
  }
}
export default tableOpra
