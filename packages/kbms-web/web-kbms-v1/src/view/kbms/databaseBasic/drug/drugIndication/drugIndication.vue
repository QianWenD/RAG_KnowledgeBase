/* @Author: zhengtian
 * @Date： 2018-04-09
 * @菜单：《适应症设置》
 */
<template>
  <div>
    <el-row :gutter="20">
      <el-col :span="12">
        <!-- 父表 -->
        <kindo-box title="查询条件" icon="xx">
          <el-form v-model.trim="parent.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('parent')">
            <el-form-item label="疾病分类名称">
              <el-input v-model.trim="parent.search.name" placeholder="" clearable></el-input>
            </el-form-item>
          </el-form>
          <div slot="control">
            <el-button icon="el-icon-search" type="primary" @click="getTable('parent')">查询</el-button>
          </div>
        </kindo-box>
        <kindo-box title="适应症信息">
          <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" :default-sort="{prop:'name',order:'descending'}" :extendOption="extend" @selection-change="(selection) => tableChange('parent', selection)" @current-change="tableClick" height="445">
            <el-table-column type="selection" fixed="left" width="30"></el-table-column>
            <el-table-column label="疾病分类名称" prop="name" min-width="120" header-align="center" show-overflow-tooltip></el-table-column>
            <el-table-column label="精确判断" width="100" align="center">
              <template slot-scope="scope">
                <el-switch v-model.trim="scope.row.matchingMode" active-value="1" inactive-value="0" @change="(val) => switchChange(scope.row, val)"></el-switch>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center" fixed="right">
              <template slot-scope="scope">
                <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
                  <el-button type="text" icon="el-icon-edit" @click="update('parent', scope.row.id)"></el-button>
                </el-tooltip>
                <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
                  <el-button type="text" icon="el-icon-delete" @click="remove('parent', scope.row.id)"></el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </kindo-table>
          <div slot="control">
            <el-button icon="el-icon-plus" type="text" @click="add('parent','','parentForm')">新增</el-button>
            <el-button icon="el-icon-delete" type="text" @click="remove('parent')">删除</el-button>
          </div>
        </kindo-box>
      </el-col>
      <el-col :span="12">
        <el-tabs class="rightTabs" v-model.trim="activeTabs" type="card">
          <el-tab-pane label="精确判断" name="1">
            <kindo-box title="查询条件">
              <el-form v-model.trim="childAccurate.search" onsubmit="return false;" :default-sort="{prop:'code',order:'descending'}" label-position="right" inline @keyup.enter.prevent.native="getTable('childAccurate')">
                <el-form-item label="疾病编码">
                  <el-input v-model.trim="childAccurate.search.code" placeholder="" clearable></el-input>
                </el-form-item>
                <el-form-item label="疾病名称">
                  <el-input v-model.trim="childAccurate.search.name" placeholder="" clearable></el-input>
                </el-form-item>
              </el-form>
              <div slot="control">
                <el-button icon="el-icon-search" type="primary" :disabled="Disabled" @click="getTable('childAccurate')">查询</el-button>
              </div>
            </kindo-box>
            <kindo-box title="疾病信息">
              <kindo-table ref="childAccurate" :url="childAccurate.url" :default-sort="{prop:'code',order:'descending'}" :queryParam="childAccurate.search" :extendOption="extend" @selection-change="(selection) => tableChange('childAccurate', selection)" height="420">
                <el-table-column type="selection" fixed="left" width="30"></el-table-column>
                <el-table-column label="疾病编码" prop="code" min-width="120" sortable="custom" header-align="center" show-overflow-tooltip></el-table-column>
                <el-table-column label="疾病名称" prop="name" min-width="120" header-align="center" show-overflow-tooltip></el-table-column>
                <el-table-column label="操作" width="100" align="center" fixed="right">
                  <template slot-scope="scope">
                    <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
                      <el-button type="text" icon="el-icon-edit" @click="update('childAccurate', scope.row.id)"></el-button>
                    </el-tooltip>
                    <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
                      <el-button type="text" icon="el-icon-delete" @click="remove('childAccurate', scope.row.id)"></el-button>
                    </el-tooltip>
                  </template>
                </el-table-column>
              </kindo-table>
              <div slot="control">
                <el-button icon="el-icon-plus" type="text" :disabled="Disabled" @click="add('childAccurate', 'matchingMode,kbmsDrugIndicationId','childAccurateForm')">新增</el-button>
                <el-button icon="el-icon-delete" type="text" :disabled="Disabled" @click="remove('childAccurate')">删除</el-button>
              </div>
            </kindo-box>
          </el-tab-pane>
          <el-tab-pane label="模糊判断" name="0">
            <kindo-box title="查询条件">
              <el-form v-model.trim="childFuzzy.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('childFuzzy')">
                <el-form-item label="疾病编码">
                  <el-input v-model.trim="childFuzzy.search.code" placeholder="" clearable></el-input>
                </el-form-item>
                <el-form-item label="疾病名称">
                  <el-input v-model.trim="childFuzzy.search.name" placeholder="" clearable></el-input>
                </el-form-item>
              </el-form>
              <div slot="control">
                <el-button icon="el-icon-search" type="primary" :disabled="Disabled" @click="getTable('childFuzzy')">查询</el-button>
              </div>
            </kindo-box>
            <kindo-box title="疾病信息">
              <kindo-table ref="childFuzzy" :url="childFuzzy.url" :queryParam="childFuzzy.search" :extendOption="extend" @selection-change="(selection) => tableChange('childFuzzy', selection)" height="420">
                <el-table-column type="selection" fixed="left" width="30"></el-table-column>
                <el-table-column label="疾病编码" prop="code" min-width="120" sortable="custom" header-align="center" show-overflow-tooltip></el-table-column>
                <el-table-column label="疾病名称" prop="name" min-width="120" header-align="center" show-overflow-tooltip></el-table-column>
                <el-table-column label="操作" width="100" align="center" fixed="right">
                  <template slot-scope="scope">
                    <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
                      <el-button type="text" icon="el-icon-edit" @click="update('childFuzzy', scope.row.id)"></el-button>
                    </el-tooltip>
                    <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
                      <el-button type="text" icon="el-icon-delete" @click="remove('childFuzzy', scope.row.id)"></el-button>
                    </el-tooltip>
                  </template>
                </el-table-column>
              </kindo-table>
              <div slot="control">
                <el-button icon="el-icon-plus" type="text" :disabled="Disabled" @click="add('childFuzzy', 'matchingMode,kbmsDrugIndicationId','childFuzzyForm')">新增</el-button>
                <el-button icon="el-icon-delete" type="text" :disabled="Disabled" @click="remove('childFuzzy')">删除</el-button>
              </div>
            </kindo-box>
          </el-tab-pane>
        </el-tabs>
      </el-col>
    </el-row>

    <!-- 主表新增-->
    <el-dialog v-drag top="0" :visible.sync="parent.dialog.visible" :title="parent.dialog.title+'疾病分类'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="parent.form" onsubmit="return false;" class="box" ref="parentForm" :rules="parent.rules" label-width="120px" label-position="right">
        <el-form-item label="疾病分类名称" prop="name">
          <el-input v-model.trim="parent.form.name"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('parent')">保 存</el-button>
        <el-button @click="parent.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 主表新增-->
    <!-- 子表_精确判断_新增-->
    <el-dialog v-drag top="0" :visible.sync="childAccurate.dialog.visible" :title="childAccurate.dialog.title + '精确判断'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="childAccurate.form" onsubmit="return false;" class="box" ref="childAccurateForm" label-width="90px" :rules="childAccurate.rules" label-position="right">
        <el-form-item label="疾病名称" prop="name">
          <el-autocomplete v-model="childAccurate.form.name" :fetch-suggestions="SearchAsyncName" placeholder="请输入名称" @select="(item)=>{handleSelect(item,'childAccurate','code')}"></el-autocomplete>
        </el-form-item>
        <el-form-item label="疾病编码" prop="code">
          <el-autocomplete v-model="childAccurate.form.code" :fetch-suggestions="SearchAsyncCode" placeholder="请输入编码" @select="(item)=>{handleSelect(item,'childAccurate','name')}"></el-autocomplete>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('childAccurate')">保 存</el-button>
        <el-button @click="childAccurate.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 子表_精确判断_新增-->
    <!-- 子表_模糊判断_新增-->
    <el-dialog v-drag top="0" :visible.sync="childFuzzy.dialog.visible" :title="childFuzzy.dialog.title+'模糊判断'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="childFuzzy.form" onsubmit="return false;" class="box" ref="childFuzzyForm" label-width="90px" :rules="childFuzzy.rules" label-position="right">
        <el-form-item label="疾病名称" prop="name">
          <el-autocomplete v-model="childFuzzy.form.name" :fetch-suggestions="SearchAsyncName" placeholder="请输入名称" @select="(item)=>{handleSelect(item,'childFuzzy','code')}"></el-autocomplete>
        </el-form-item>
        <el-form-item label="疾病编码" prop="code">
          <el-autocomplete v-model="childFuzzy.form.code" :fetch-suggestions="SearchAsyncCode" placeholder="请输入编码" @select="(item)=>{handleSelect(item,'childFuzzy','name')}"></el-autocomplete>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('childFuzzy')">保 存</el-button>
        <el-button @click="childFuzzy.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 子表_模糊判断_新增-->
  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  name: 'drugIndication',
  mixins: [tableOpra],
  data() {
    return {
      // 字表查/删/新增默认可用
      Disabled: false,
      // 主表默认选第一行数据
      extend: { selectedFirst: true },
      activeTabs: '1',
      dict: {
        AUDIT_STATUS: []
      },
      // 存放远程ICD编码数据
      restaurants: [],

      parent: {
        url: config.api.parent,
        selection: [],
        dialog: {
          visible: false,
          title: '新增'
        },
        form: {
          id: '',
          name: ''
        },
        rules: {
          name: [{ required: true, message: '请输入名称', trigger: 'blur' }, { min: 0, max: 30, message: '长度不能超过30' }]
        },
        search: {
          name: ''
        }
      },
      childAccurate: {
        url: config.api.child,
        selection: [],
        dialog: {
          visible: false,
          title: '新增'
        },
        form: {
          id: '',
          matchingMode: '1',
          kbmsDrugIndicationId: '',
          name: '',
          code: ''
        },
        rules: {
          name: [{ min: 0, max: 30, message: '长度不能超过30' }],
          code: [{ min: 0, max: 30, message: '长度不能超过30' }]
        },
        search: {
          kbmsDrugIndicationId: '',
          name: '',
          code: '',
          matchingMode: '1'
        }
      },
      childFuzzy: {
        url: config.api.child,
        selection: [],
        dialog: {
          visible: false,
          title: '新增'
        },
        form: {
          id: '',
          matchingMode: '0',
          kbmsDrugIndicationId: '',
          name: '',
          code: ''
        },
        rules: {
          name: [{ min: 0, max: 30, message: '长度不能超过30' }],
          code: [{ min: 0, max: 30, message: '长度不能超过30' }]
        },
        search: {
          kbmsDrugIndicationId: '',
          name: '',
          matchingMode: '0'
        }
      }
    }
  },
  methods: {
    tableClick(row) {
      if (row) {
        this.activeTabs = row.matchingMode
        this.childAccurate.form.kbmsDrugIndicationId = row.id
        this.childAccurate.search.kbmsDrugIndicationId = row.id
        this.childFuzzy.form.kbmsDrugIndicationId = row.id
        this.childFuzzy.search.kbmsDrugIndicationId = row.id
        this.Disabled = false
        this.tabClick()
      } else {
        this.Disabled = true
        this.$refs.childAccurate.clearTable()
        this.$refs.childFuzzy.clearTable()
      }
    },
    tabClick() {
      this.$refs['childAccurate'].reloadData()
      this.$refs['childFuzzy'].reloadData()
    },
    switchChange(row, val) {
      let parent = this['parent']
      this.activeTabs = val
      parent.form.id = row.id
      parent.form.matchingMode = val
      parent.form.name = row.name
      this.$http.put(parent.url, parent.form).then(res => {
        this.tabClick(val)
      })
    },
    // 可远程模糊可手填input框(名称)
    SearchAsyncName(queryString, callback) {
      let arr = []
      if (queryString) {
        this.$http.get(config.api.icd10, { params: { rows: 200, name: queryString } }).then(res => {
          this.restaurants =
            res.data.rows.map(item => {
              return { value: item.diseaseName, code: item.diseaseCode }
            }) || []
          callback(this.restaurants)
        })
      } else {
        callback(arr)
      }
    },
    // 可远程模糊可手填input框(编码)
    SearchAsyncCode(queryString, callback) {
      let arr = []
      if (queryString) {
        this.$http.get(config.api.icd10, { params: { rows: 200, code: queryString } }).then(res => {
          this.restaurants =
            res.data.rows.map(item => {
              return { value: item.diseaseCode, name: item.diseaseName }
            }) || []
          callback(this.restaurants)
        })
      } else {
        callback(arr)
      }
    },
    // 点击下拉框
    handleSelect(item, table, key) {
      this[table].form[key] = item[key]
    }
  },
  watch: {},
  created() {
    this.getDictionary()
  },

  mounted() {
    this.$nextTick(() => {
      this.getTable('parent')
    })
  }
}
</script>

<style lang="scss" scoped>
.rightTabs {
  margin: 5px;
}
</style>
