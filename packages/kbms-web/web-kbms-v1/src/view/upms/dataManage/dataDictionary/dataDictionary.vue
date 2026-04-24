<template>
  <div>
    <el-row>
      <el-col :span="12">
        <kindo-box title="查询条件" icon="el-icon-search">
          <el-form :model="cateSearch" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getCate('init')">
            <el-form-item label="字典类型">
              <el-input v-model.trim="cateSearch.catalog" placeholder="请输入字典类型"></el-input>
            </el-form-item>
          </el-form>

          <div slot="control">
            <el-button type="primary" icon="el-icon-search" @click="getCate('init')">查询</el-button>
          </div>
        </kindo-box>

        <kindo-box title="基础字典" icon="fa-bar-chart" class="cateTable">
          <kindo-table ref="table" :url="url" :queryParam="cateSearch" @row-click="tableClick">
            <el-table-column label="字典类型" prop="catalog" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="备注" prop="catalogDesc" min-width="140" header-align="center" show-overflow-tooltip></el-table-column>
            <el-table-column label="操作" width="120" fixed="right" align="center">
              <template slot-scope="scope">
                <el-tooltip class="item" effect="dark" :open-delay="300" content="重新加载" placement="top-start">
                  <el-button type="text" icon="el-icon-refresh" @click="resetData(scope.$index, scope.row)"></el-button>
                </el-tooltip>
                <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
                  <el-button type="text" icon="el-icon-edit" @click="editCate(scope.$index, scope.row)"></el-button>
                </el-tooltip>
                <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
                  <el-button type="text" icon="el-icon-delete" @click="deleteCate(scope.$index, scope.row)"></el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </kindo-table>

          <div slot="control">
            <el-button icon="el-icon-plus" type="text" @click="addCate">新增</el-button>
          </div>
        </kindo-box>
        <el-dialog top="0" :title="(cateModel.id === ''? '新增':'编辑') + '字典类型'" :visible.sync="cateVisible" :close-on-click-modal="false">
          <el-form :model="cateModel" :rules="cateRules" ref="cateModel" label-width="90px">
            <el-form-item label="字典类型" prop="catalog">
              <el-input v-model.trim="cateModel.catalog"></el-input>
            </el-form-item>
            <el-form-item label="备注" prop="catalogDesc">
              <el-input type="textarea" :rows="2" v-model.trim="cateModel.catalogDesc"></el-input>
            </el-form-item>
          </el-form>
          <div slot="footer" class="dialog-footer">
            <el-button icon="el-icon-check" type="primary" @click="saveCate">完 成</el-button>
            <el-button @click="cateVisible = false">取 消</el-button>
          </div>
        </el-dialog>
      </el-col>
      <el-col :span="12">

        <kindo-box title="查询条件" icon="el-icon-search">
          <el-form :model="dataSearch" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getData">
            <el-form-item label="字典键值">
              <el-input v-model.trim="dataSearch.label" placeholder="请输入字典键值"></el-input>
            </el-form-item>
          </el-form>

          <div slot="control">
            <el-button icon="el-icon-search" type="primary" @click="getData">查询</el-button>
          </div>
        </kindo-box>

        <kindo-box title="字典明细" icon="fa-bar-chart">
          <kindo-table ref="dataTable" :url="url2" :queryParam="dataSearch" :default-sort="tableSort">
            <el-table-column label="字典键" prop="label" min-width="140" header-align="center" sortable show-overflow-tooltip></el-table-column>
            <el-table-column label="字典值" prop="value" min-width="140" header-align="center" sortable show-overflow-tooltip></el-table-column>
            <el-table-column label="操作" width="60" fixed="right" align="center">
              <template slot-scope="scope">
                <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
                  <el-button type="text" icon="el-icon-delete" @click="deleteData(scope.$index, scope.row)"></el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </kindo-table>

          <div slot="control">
            <el-button icon="el-icon-plus" type="text" @click="addData">新增</el-button>
          </div>
        </kindo-box>
        <el-dialog top="0" title="字典数据新增" :visible.sync="dataVisible" :close-on-click-modal="false">
          <el-form :model="dataModel" :rules="dataRules" ref="dataModel" label-width="80px">
            <el-row>
              <el-col :span="12">
                <el-form-item label="字典键" prop="label">
                  <el-input v-model.trim="dataModel.label"></el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="字典值" prop="value">
                  <el-input v-model.trim="dataModel.value"></el-input>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
          <div slot="footer" class="dialog-footer">
            <el-button icon="el-icon-check" type="primary" @click="saveData">完 成</el-button>
            <el-button @click="dataVisible = false">取 消</el-button>
          </div>
        </el-dialog>
      </el-col>
    </el-row>

  </div>
</template>

<script>
import config from './config'

export default {
  name: 'dataDictionary',
  data() {
    return {
      // 表格默认排序
      tableSort: {
        prop: 'value',
        order: 'ascending'
      },
      url: config.api.getCate,
      url2: config.api.getData,

      // 字典类型查询实体
      cateSearch: {
        catalog: ''
      },

      // 字典类型实体
      cateModel: {
        id: '',
        catalog: '',
        catalogDesc: ''
      },

      // 字典数据实体
      dataModel: {
        id: '',
        label: '',
        value: '',
        catalog: ''
      },

      // 字典数据查询实体
      dataSearch: {
        label: '',
        catalog: ''
      },

      // 字典类型实体验证
      cateRules: {
        catalog: [{ required: true, message: '请输入字典类型', trigger: 'blur' }, { min: 0, max: 32, message: '请输入最多32个字', trigger: 'blur' }],
        catalogDesc: [{ min: 0, max: 255, message: '请输入最多255个字', trigger: 'blur' }]
      },

      // 字典数据实体验证
      dataRules: {
        label: [{ required: true, message: '请输入字典键', trigger: 'blur' }, { min: 0, max: 32, message: '请输入最多32个字', trigger: 'blur' }],
        value: [{ required: true, message: '请输入字典值', trigger: 'blur' }, { min: 0, max: 32, message: '请输入最多32个字', trigger: 'blur' }]
      },

      // 字典类型编辑状态
      cateVisible: false,

      // 字典数据新增状态
      dataVisible: false
    }
  },

  created() {
    this._cateModel = Object.assign({}, this.cateModel)
    this._dataModel = Object.assign({}, this.dataModel)
  },

  mounted() {
    this.$nextTick(() => {
      this.getCate()
    })
  },

  methods: {
    // 查询数据字典类型
    getCate(type) {
      if (type === 'init') {
        this.$refs.table.reloadData().then(res => {
          if (res.data.rows.length > 0) {
            this.$refs.table.setCurrentRowIndex(0)
            this.tableClick(res.data.rows[0])
          } else {
            this.$refs.dataTable.clearTable()
          }
        })
      } else {
        this.$refs.table.loadData().then(res => {
          if (res.data.rows.length > 0) {
            this.$refs.table.setCurrentRowIndex(0)
            this.tableClick(res.data.rows[0])
          } else {
            this.$refs.dataTable.clearTable()
          }
        })
      }
    },

    // 重新加载某字典类型数据字典缓存
    resetData(index, row) {
      this.$http.get(config.api.reset, { params: { catalog: row.catalog } }).then(() => {
        kindo.util.alert('重新加载(' + row.catalog + ')数据字典缓存成功')
      })
    },

    // 当点击选中数据字典类型某一行时
    tableClick(row) {
      this.dataSearch.catalog = row.catalog
      this.dataModel.catalog = row.catalog
      this.dataModel.id = row.id
      this.getData()
    },

    // 新增数据字典类型
    addCate() {
      kindo.util
        .promise(() => {
          this.cateVisible = true
        })
        .then(() => {
          this.$refs.cateModel.resetFields()
        })
        .then(() => {
          this.cateModel = Object.assign(this.cateModel, this._cateModel)
        })
    },

    // 编辑数据字典类型
    editCate(index, row) {
      kindo.util
        .promise(() => {
          this.cateVisible = true
        })
        .then(() => {
          this.$refs.cateModel.resetFields()
        })
        .then(() => {
          this.$http.get(config.api.getDetail, { params: { id: row.id } }).then(res => {
            this.cateModel = Object.assign({}, row, res.data)
          })
        })
    },

    // 删除数据字典类型
    deleteCate(index, row) {
      kindo.util
        .promise(() => {
          this.cateModel = Object.assign({}, row)
        })
        .then(() => {
          kindo.util.confirm('确定删除吗?', undefined, undefined, () => {
            this.$http.post(config.api.deleteCate, { id: this.cateModel.id }).then(res => {
              kindo.util.alert('删除成功', '提示', 'success')
              this.getCate()
            })
          })
        })
    },

    // 保存数据字典类型(新增 / 修改)
    saveCate() {
      this.$refs.cateModel.validate(valid => {
        if (valid) {
          if (this.cateModel.id) {
            this.$http.post(config.api.editCate, this.cateModel).then(res => {
              kindo.util.alert('修改数据字典类型成功', '提示', 'success')
              this.cateVisible = false
              this.getCate('init')
            })
          } else {
            this.$http.post(config.api.addCate, this.cateModel).then(res => {
              kindo.util.alert('新增数据字典类型成功', '提示', 'success')
              this.cateVisible = false
              this.getCate('init')
            })
          }
        }
      })
    },

    // 查询数据字典
    getData() {
      this.$refs.dataTable.loadData()
    },

    // 新增数据字典名称
    addData() {
      kindo.util
        .promise(() => {
          this.dataVisible = true
        })
        .then(() => {
          this.$refs.dataModel.resetFields()
        })
    },

    // 删除数据字典名称
    deleteData(index, row) {
      kindo.util.confirm('确定删除吗?', undefined, undefined, () => {
        this.$http.post(config.api.deleteData, { id: row.id }).then(res => {
          kindo.util.alert('删除字典数据成功', '提示', 'success')
          this.getData()
        })
      })
    },

    // 保存字典数据(新增)
    saveData() {
      this.$refs.dataModel.validate(valid => {
        if (valid) {
          this.$http.post(config.api.insertData, this.dataModel).then(res => {
            kindo.util.alert('新增字典数据成功', '提示', 'success')
            this.dataVisible = false
            this.getData()
          })
        }
      })
    }
  },

  computed: {}
}
</script>

<style scoped>
</style>