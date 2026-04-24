/*
 * @Author: zhengtian
 * @Date: 2018-04-13
 * @Desc: 中药饮片配伍禁忌规则
 */
<template>
  <div>
    <!-- 父表 -->
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="parent.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('parent')">
        <el-form-item label="中药饮片名称A">
          <el-input v-model.trim="parent.search.genericNameA" placeholder="" clearable></el-input>
        </el-form-item>
        <el-form-item label="中药饮片名称B">
          <el-input v-model.trim="parent.search.genericNameB" placeholder="" clearable></el-input>
        </el-form-item>
        <el-form-item label="配伍禁忌类型">
          <el-select v-model.trim="parent.search.essType" filterable clearable>
            <el-option v-for="item in dict.TABOO_TYPE" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getTable('parent')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="中药饮片配伍禁忌规则">
      <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" :extendOption="extend" @selection-change="(selection) => tableChange('parent', selection)" :default-sort="tableSort">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="中药饮片编码A" prop="drugCodeA" min-width="100" header-align="center" sortable="custom"></el-table-column>
        <el-table-column label="中药饮片名称A" prop="genericNameA" min-width="120" header-align="center" sortable="custom"></el-table-column>
        <el-table-column label="中药饮片编码B" prop="drugCodeB" min-width="120" header-align="center" sortable="custom"></el-table-column>
        <el-table-column label="中药饮片名称B" prop="genericNameB" min-width="120" header-align="center" sortable="custom"></el-table-column>
        <el-table-column label="配伍禁忌类型" prop="essType" min-width="120" header-align="center" sortable="custom" :formatter="(row, column) => kindo.dictionary.getLabel(dict.TABOO_TYPE,row[column.property])"></el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status' :filters="columnFilters(dict.AUDIT_STATUS)" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update('parent', scope.row.id, 'updateBefore')"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('parent', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="add('parent')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('parent')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="audit('parent')">审核</el-button>
      </div>
    </kindo-box>
    <!-- 父表弹框-->
    <el-dialog v-drag top="0" :visible.sync="parent.dialog.visible" :title="parent.dialog.title +'配伍禁忌规则'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="parent.form" class="box" onsubmit="return false;" ref="parentForm" label-width="130px" :rules="parent.rules" label-position="right">
        <el-form-item label="中药饮片名称A" prop="drugCodeA">
          <el-select v-model.trim="parent.form.drugCodeA" clearable filterable placeholder="请输入选择" remote :remote-method="(str) => getDictRemote('drugNameA', 'genericName', str)">
            <li class="title">
              <span>药品编码</span>
              <span>药品名称</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in dictRemote.drugNameA.data" :key="item.drugCode" :label="item.genericName" :value="item.drugCode">
              <span>{{ item.drugCode }}</span>
              <span>{{ item.genericName }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="中药饮片名称B" prop="drugCodeB">
          <el-select v-model.trim="parent.form.drugCodeB" clearable filterable placeholder="请输入选择" remote :remote-method="(str) => getDictRemote('drugNameB', 'genericName', str)">
            <li class="title">
              <span>药品编码</span>
              <span>药品名称</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in dictRemote.drugNameB.data" :key="item.drugCode" :label="item.genericName" :value="item.drugCode">
              <span>{{ item.drugCode }}</span>
              <span>{{ item.genericName }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="配伍禁忌类型" prop="essType">
          <el-select v-model.trim="parent.form.essType" filterable clearable>
            <el-option v-for="item in dict.TABOO_TYPE" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('parent')">保 存</el-button>
        <el-button @click="parent.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 父表弹框-->
  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  name: 'huangyin',
  mixins: [tableOpra],
  data() {
    return {
      // 主表默认选第一行数据
      extend: { selectedFirst: true },
      loading: false,
      disabled: true,
      tableSort: {
        prop: 'drugCodeA',
        order: 'ascending'
      },
      dict: {
        // 审核状态
        AUDIT_STATUS: [],
        // 年龄单位
        TABOO_TYPE: []
      },
      dictRemote: {
        drugNameA: {
          url: config.api.drugName,
          data: []
        },
        drugNameB: {
          url: config.api.drugName,
          data: []
        }
      },
      parent: {
        url: config.api.parent,
        selection: [],
        search: {
          name: '',
          status: ''
        },
        dialog: {
          visible: false,
          title: '新增'
        },
        form: {
          id: '',
          drugCodeA: '',
          drugCodeB: '',
          essType: ''
        },
        rules: {
          drugCodeA: [
            { required: true, message: '请输入中药饮片名称A', trigger: 'blur' },
            {
              validator: (rule, value, callback) => {
                if (value === this.parent.form.drugCodeB) {
                  callback(new Error('中药饮片名称A和中药饮片名称B不能重'))
                } else {
                  callback()
                }
              },
              trigger: 'blur'
            }
          ],
          drugCodeB: [
            { required: true, message: '请输入中药饮片名称B', trigger: 'blur' },
            {
              validator: (rule, value, callback) => {
                if (value === this.parent.form.drugCodeA) {
                  callback(new Error('中药饮片名称A和中药饮片名称B不能重'))
                } else {
                  callback()
                }
              },
              trigger: 'blur'
            }
          ],
          essType: [{ required: true, message: '请选择配伍禁忌类型', trigger: 'blur' }]
        }
      }
    }
  },
  methods: {
    getDictRemote(dict, searchName, searchVal) {
      let param = { rows: 200, [searchName]: searchVal, drugKind: '2', status: '1' }
      this.$http.get(this.dictRemote[dict].url, { params: param }).then(res => {
        this.dictRemote[dict].data = res.data.rows
      })
    },
    dictRemoteClear(dict) {
      this.dictRemote[dict].data = []
    },
    updateBefore(row) {
      // 这里做特殊处理，接口不支持drugCode查询，后续跟进请做修改
      this.$http.get(this.dictRemote.drugNameA.url, { params: { rows: 200, drugKind: '2' } }).then(res => {
        let data = res.data.rows
        this.dictRemote['drugNameA'].data = data.filter(item => item['drugCode'] === this.parent.form.drugCodeA)
        this.dictRemote['drugNameB'].data = data.filter(item => item['drugCode'] === this.parent.form.drugCodeB)
      })
    }
  },

  created() {
    this.getDictionary()
  },

  mounted() {
    this.$nextTick(() => {
      this.getTable('parent')
      // this.getDictRemote('drugName')
    })
  },
  watch: {
    'parent.dialog.visible'(val) {
      if (val === false) {
        this.dictRemoteClear('drugNameA')
      }
    }
  }
}
</script>