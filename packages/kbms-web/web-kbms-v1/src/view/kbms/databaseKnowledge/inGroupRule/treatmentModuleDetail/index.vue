/* @Author: wuhuihui
 *菜单：知识数据库-诊疗详情
<template>
  <div>
    <el-tabs v-model="tabsActive" type="card">
      <el-tab-pane label="检查" name="first">
        <kindo-box title="查询条件">
          <el-form :model="table_jc.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('table_jc')">
            <el-form-item label="检查编码">
              <el-input v-model.trim="table_jc.search.itemCode" clearable></el-input>
            </el-form-item>
            <el-form-item label="检查名称">
              <el-input v-model.trim="table_jc.search.itemName" clearable></el-input>
            </el-form-item>
          </el-form>
          <div slot="control">
            <el-button icon="el-icon-search" type="primary" :disabled="apiType === 'default' && !groupingTreatId" @click="getTable('table_jc')">查询</el-button>
          </div>
        </kindo-box>

        <kindo-box title="检查信息">
          <kindo-table ref="table_jc" :url="table_jc.url" :queryParam="Object.assign({},table_jc.search,{groupingTreatId: groupingTreatId, groupTreatExpId: groupTreatExpId, groupTreatExpSubitem: groupTreatExpSubitem })" :pageSize="5" @selection-change="(selection) => tableChange('table_jc', selection)">
            <el-table-column type="selection" fixed="left" width="30"></el-table-column>
            <el-table-column label="检查编码" fixed="left" prop="itemCode" width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="检查名称" fixed="left" prop="itemName" min-width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="单位" prop="unitName" v-if="apiType === 'rule'" width="100" header-align="center" show-overflow-tooltip></el-table-column>
            <el-table-column label="数量" prop="amount" v-if="apiType === 'rule'" width="80" align="right" header-align="center" show-overflow-tooltip></el-table-column>
            <el-table-column label="备注" prop="remark" min-width="200" header-align="center" show-overflow-tooltip>
            </el-table-column>
            <el-table-column label="审核状态" prop="status" v-if="apiType === 'default'" width="100" align="center" sortable='custom'>
              <template slot-scope="scope">
                <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>
                  {{scope.row.status === '1'?'已审核': '未审核'}}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center" fixed="right">
              <template slot-scope="scope">
                <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
                  <el-button type="text" icon="el-icon-edit" @click="update('table_jc', scope.row)"></el-button>
                </el-tooltip>
                <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
                  <el-button type="text" icon="el-icon-delete" @click="remove('table_jc', scope.row.id)"></el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </kindo-table>
          <div slot="control">
            <el-button icon="el-icon-plus" type="text" :disabled="apiType === 'default' && !groupingTreatId" @click="add('table_jc')">批量新增</el-button>
            <el-button icon="el-icon-delete" type="text" :disabled="apiType === 'default' && !groupingTreatId" @click="remove('table_jc')">删除</el-button>
            <el-button icon="el-icon-view" type="text" :disabled="apiType === 'default' && !groupingTreatId" v-if="canAudit" @click="audit('table_jc')">审核</el-button>
          </div>
        </kindo-box>
      </el-tab-pane>

      <el-tab-pane label="检验" name="second">
        <kindo-box title="查询条件">
          <el-form :model="table_jy.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('table_jy')">
            <el-form-item label="检验编码">
              <el-input v-model.trim="table_jy.search.itemCode" clearable></el-input>
            </el-form-item>
            <el-form-item label="检验名称">
              <el-input v-model.trim="table_jy.search.itemName" clearable></el-input>
            </el-form-item>
          </el-form>
          <div slot="control">
            <el-button icon="el-icon-search" type="primary" :disabled="apiType === 'default' && !groupingTreatId" @click="getTable('table_jy')">查询</el-button>
          </div>
        </kindo-box>

        <kindo-box title="检验信息">
          <kindo-table ref="table_jy" :url="table_jy.url" :queryParam="Object.assign({},table_jy.search,{groupingTreatId: groupingTreatId, groupTreatExpId: groupTreatExpId, groupTreatExpSubitem: groupTreatExpSubitem })" :pageSize="5" @selection-change="(selection) => tableChange('table_jy', selection)">
            <el-table-column type="selection" fixed="left" width="30"></el-table-column>
            <el-table-column label="检验编码" fixed="left" prop="itemCode" width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="检验名称" fixed="left" prop="itemName" min-width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="单位" prop="unitName" v-if="apiType === 'rule'" width="100" header-align="center" show-overflow-tooltip></el-table-column>
            <el-table-column label="数量" prop="amount" v-if="apiType === 'rule'" width="80" align="right" header-align="center" show-overflow-tooltip></el-table-column>
            <el-table-column label="备注" prop="remark" min-width="200" header-align="center" show-overflow-tooltip>
            </el-table-column>
            <el-table-column label="审核状态" prop="status" v-if="apiType === 'default'" width="100" align="center" sortable='custom'>
              <template slot-scope="scope">
                <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>
                  {{scope.row.status === '1'?'已审核': '未审核'}}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center" fixed="right">
              <template slot-scope="scope">
                <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
                  <el-button type="text" icon="el-icon-edit" @click="update('table_jy', scope.row)"></el-button>
                </el-tooltip>
                <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
                  <el-button type="text" icon="el-icon-delete" @click="remove('table_jy', scope.row.id)"></el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </kindo-table>
          <div slot="control">
            <el-button icon="el-icon-plus" type="text" :disabled="apiType === 'default' && !groupingTreatId" @click="add('table_jy')">批量新增</el-button>
            <el-button icon="el-icon-delete" type="text" :disabled="apiType === 'default' && !groupingTreatId" @click="remove('table_jy')">删除</el-button>
            <el-button icon="el-icon-view" type="text" :disabled="apiType === 'default' && !groupingTreatId" v-if="canAudit" @click="audit('table_jy')">审核</el-button>
          </div>
        </kindo-box>
      </el-tab-pane>

      <el-tab-pane label="治疗" name="third">
        <kindo-box title="查询条件">
          <el-form :model="table_zl.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('table_zl')">
            <el-form-item label="治疗编码">
              <el-input v-model.trim="table_zl.search.itemCode" clearable></el-input>
            </el-form-item>
            <el-form-item label="治疗名称">
              <el-input v-model.trim="table_zl.search.itemName" clearable></el-input>
            </el-form-item>
          </el-form>
          <div slot="control">
            <el-button icon="el-icon-search" type="primary" :disabled="apiType === 'default' && !groupingTreatId" @click="getTable('table_zl')">查询</el-button>
          </div>
        </kindo-box>

        <kindo-box title="治疗信息">
          <kindo-table ref="table_zl" :url="table_zl.url" :queryParam="Object.assign({},table_zl.search,{groupingTreatId: groupingTreatId, groupTreatExpId: groupTreatExpId, groupTreatExpSubitem: groupTreatExpSubitem })" :pageSize="5" @selection-change="(selection) => tableChange('table_zl', selection)">
            <el-table-column type="selection" fixed="left" width="30"></el-table-column>
            <el-table-column label="治疗编码" fixed="left" prop="itemCode" width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="治疗名称" fixed="left" prop="itemName" min-width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="单位" prop="unitName" v-if="apiType === 'rule'" width="100" header-align="center" show-overflow-tooltip></el-table-column>
            <el-table-column label="数量" prop="amount" v-if="apiType === 'rule'" width="80" align="right" header-align="center" show-overflow-tooltip></el-table-column>
            <el-table-column label="备注" prop="remark" min-width="200" header-align="center" show-overflow-tooltip>
            </el-table-column>
            <el-table-column label="审核状态" prop="status" v-if="apiType === 'default'" width="100" align="center" sortable='custom'>
              <template slot-scope="scope">
                <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>
                  {{scope.row.status === '1'?'已审核': '未审核'}}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center" fixed="right">
              <template slot-scope="scope">
                <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
                  <el-button type="text" icon="el-icon-edit" @click="update('table_zl', scope.row)"></el-button>
                </el-tooltip>
                <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
                  <el-button type="text" icon="el-icon-delete" @click="remove('table_zl', scope.row.id)"></el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </kindo-table>
          <div slot="control">
            <el-button icon="el-icon-plus" type="text" :disabled="apiType === 'default' && !groupingTreatId" @click="add('table_zl')">批量新增</el-button>
            <el-button icon="el-icon-delete" type="text" :disabled="apiType === 'default' && !groupingTreatId" @click="remove('table_zl')">删除</el-button>
            <el-button icon="el-icon-view" type="text" :disabled="apiType === 'default' && !groupingTreatId" v-if="canAudit" @click="audit('table_zl')">审核</el-button>
          </div>
        </kindo-box>
      </el-tab-pane>

      <el-tab-pane label="手术" name="four">
        <kindo-box title="查询条件">
          <el-form :model="table_ss.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('table_ss')">
            <el-form-item label="手术编码">
              <el-input v-model.trim="table_ss.search.itemCode" clearable></el-input>
            </el-form-item>
            <el-form-item label="手术名称">
              <el-input v-model.trim="table_ss.search.itemName" clearable></el-input>
            </el-form-item>
          </el-form>
          <div slot="control">
            <el-button icon="el-icon-search" type="primary" :disabled="apiType === 'default' && !groupingTreatId" @click="getTable('table_ss')">查询</el-button>
          </div>
        </kindo-box>

        <kindo-box title="手术信息">
          <kindo-table ref="table_ss" :url="table_ss.url" :queryParam="Object.assign({},table_ss.search,{groupingTreatId: groupingTreatId, groupTreatExpId: groupTreatExpId, groupTreatExpSubitem: groupTreatExpSubitem })" :pageSize="5" @selection-change="(selection) => tableChange('table_ss', selection)">
            <el-table-column type="selection" fixed="left" width="30"></el-table-column>
            <el-table-column label="手术编码" fixed="left" prop="itemCode" width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="手术名称" fixed="left" prop="itemName" min-width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="单位" prop="unitName" v-if="apiType === 'rule'" width="100" header-align="center" show-overflow-tooltip></el-table-column>
            <el-table-column label="数量" prop="amount" v-if="apiType === 'rule'" width="80" align="right" header-align="center" show-overflow-tooltip></el-table-column>
            <el-table-column label="备注" prop="remark" min-width="200" header-align="center" show-overflow-tooltip>
            </el-table-column>
            <el-table-column label="审核状态" prop="status" v-if="apiType === 'default'" width="100" align="center" sortable='custom'>
              <template slot-scope="scope">
                <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>
                  {{scope.row.status === '1'?'已审核': '未审核'}}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center" fixed="right">
              <template slot-scope="scope">
                <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
                  <el-button type="text" icon="el-icon-edit" @click="update('table_ss', scope.row)"></el-button>
                </el-tooltip>
                <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
                  <el-button type="text" icon="el-icon-delete" @click="remove('table_ss', scope.row.id)"></el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </kindo-table>
          <div slot="control">
            <el-button icon="el-icon-plus" type="text" :disabled="apiType === 'default' && !groupingTreatId" @click="add('table_ss')">批量新增</el-button>
            <el-button icon="el-icon-delete" type="text" :disabled="apiType === 'default' && !groupingTreatId" @click="remove('table_ss')">删除</el-button>
            <el-button icon="el-icon-view" type="text" :disabled="apiType === 'default' && !groupingTreatId" v-if="canAudit" @click="audit('table_ss')">审核</el-button>
          </div>
        </kindo-box>
      </el-tab-pane>

      <el-tab-pane label="耗材" name="five">
        <kindo-box title="查询条件">
          <el-form :model="table_hc.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('table_hc')">
            <el-form-item label="耗材编码">
              <el-input v-model.trim="table_hc.search.itemCode" clearable></el-input>
            </el-form-item>
            <el-form-item label="耗材名称">
              <el-input v-model.trim="table_hc.search.itemName" clearable></el-input>
            </el-form-item>
          </el-form>
          <div slot="control">
            <el-button icon="el-icon-search" type="primary" :disabled="apiType === 'default' && !groupingTreatId" @click="getTable('table_hc')">查询</el-button>
          </div>
        </kindo-box>

        <kindo-box title="耗材信息">
          <kindo-table ref="table_hc" :url="table_hc.url" :queryParam="Object.assign({},table_hc.search,{groupingTreatId: groupingTreatId, groupTreatExpId: groupTreatExpId, groupTreatExpSubitem: groupTreatExpSubitem })" :pageSize="5" @selection-change="(selection) => tableChange('table_hc', selection)">
            <el-table-column type="selection" fixed="left" width="30"></el-table-column>
            <el-table-column label="耗材编码" fixed="left" prop="itemCode" width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="耗材名称" fixed="left" prop="itemName" min-width="150" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
            <el-table-column label="单位" prop="unitName" v-if="apiType === 'rule'" width="100" header-align="center" show-overflow-tooltip></el-table-column>
            <el-table-column label="数量" prop="amount" v-if="apiType === 'rule'" width="80" align="right" header-align="center" show-overflow-tooltip></el-table-column>
            <el-table-column label="备注" prop="remark" min-width="200" header-align="center" show-overflow-tooltip>
            </el-table-column>
            <el-table-column label="审核状态" prop="status" v-if="apiType === 'default'" width="100" align="center" sortable='custom'>
              <template slot-scope="scope">
                <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>
                  {{scope.row.status === '1'?'已审核': '未审核'}}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center" fixed="right">
              <template slot-scope="scope">
                <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
                  <el-button type="text" icon="el-icon-edit" @click="update('table_hc', scope.row)"></el-button>
                </el-tooltip>
                <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
                  <el-button type="text" icon="el-icon-delete" @click="remove('table_hc', scope.row.id)"></el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </kindo-table>
          <div slot="control">
            <el-button icon="el-icon-plus" type="text" :disabled="apiType === 'default' && !groupingTreatId" @click="add('table_hc')">批量新增</el-button>
            <el-button icon="el-icon-delete" type="text" :disabled="apiType === 'default' && !groupingTreatId" @click="remove('table_hc')">删除</el-button>
            <el-button icon="el-icon-view" type="text" :disabled="apiType === 'default' && !groupingTreatId" v-if="canAudit" @click="audit('table_hc')">审核</el-button>
          </div>
        </kindo-box>
      </el-tab-pane>

      <el-tab-pane label="化学药" name="six">
        <chemi-table :groupingTreatId="groupingTreatId" :groupTreatExpId="groupTreatExpId" :groupTreatExpSubitem="groupTreatExpSubitem" :canAudit="canAudit" :apiType="apiType"></chemi-table>
      </el-tab-pane>

      <el-tab-pane label="中成药" name="seven">
        <chinese-table :groupingTreatId="groupingTreatId" :groupTreatExpId="groupTreatExpId" :groupTreatExpSubitem="groupTreatExpSubitem" :canAudit="canAudit" :apiType="apiType"></chinese-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-drag top="0" :visible.sync="dialog.visible" :title="(dialog.form.id?'编辑':'新增') + dialog.title" append-to-body :close-on-click-modal="false">
      <el-form :model="dialog.form" onsubmit="return false;" class="box" ref="form" label-width="90px" :rules="rules" label-position="right">
        <el-form-item label="诊疗项目" prop="itemId">
          <el-select v-if="!dialog.form.id" v-model.trim="dialog.form.itemId" ref="focusSelect" :disabled="dialog.form.id !== ''" multiple size="mini" @blur="(ev)=>{blurSel(ev,dialog.form,'itemId','zlList')}" placeholder="请输入选择" clearable filterable :loading="loading" remote :remote-method="getZlTList">
            <li class="title">
              <span>代码值</span>
              <span>代码标题</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in list.zlList" :key="item.value" :label="item.label" :value="item.value">
              <span>{{ item.code }}</span>
              <span>{{ item.label }}</span>
            </el-option>
          </el-select>
          <el-input v-else v-model="dialog.form.itemName" disabled></el-input>
        </el-form-item>
        <el-form-item label="数量" v-if="apiType === 'rule'" prop="amount">
          <el-input-number :controls="false" :min="0" :max="999" :precision="0" v-model.trim="dialog.form.amount">
          </el-input-number>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input type="textarea" :rows="2" ref="focusInput" placeholder="可输入200字" v-model.trim="dialog.form.remark">
          </el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save">保 存</el-button>
        <el-button @click="dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>

  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
import chemiTable from './chemiTable.vue'
import chineseTable from './chineseTable.vue'
export default {
  name: 'zlDetailModule',
  mixins: [tableOpra],
  components: {
    chemiTable, chineseTable
  },
  props: {
    // 诊疗项目所需参数 上表ID
    groupingTreatId: {
      type: String,
      default: ''
    },
    // 关联表达式诊疗所需参数 上表ID
    groupTreatExpId: {
      type: String,
      default: ''
    },
    // 关联表达式诊疗所需参数 点击子项
    groupTreatExpSubitem: {
      type: String,
      default: ''
    },
    // 是否可以进行审核
    canAudit: {
      type: Boolean,
      default: true
    },
    // api采用 诊疗模块/诊断诊疗规则 default/rule
    apiType: {
      type: String,
      default: 'default'
    }
  },
  data() {
    return {
      loading: false,
      tabsActive: 'first',
      table_jc: {
        search: {
          itemCode: '',
          itemName: '',
          codeType: '1'
        },
        url: config.api[this.apiType].group,
        selection: []
      },
      table_jy: {
        search: {
          itemName: '',
          itemCode: '',
          codeType: '2'
        },
        url: config.api[this.apiType].group,
        selection: []
      },
      table_zl: {
        search: {
          itemName: '',
          itemCode: '',
          codeType: '3'
        },
        url: config.api[this.apiType].group,
        selection: []
      },
      table_ss: {
        search: {
          itemName: '',
          itemCode: '',
          codeType: '4'
        },
        url: config.api[this.apiType].group,
        selection: []
      },
      table_hc: {
        search: {
          itemName: '',
          itemCode: '',
          codeType: '5'
        },
        url: config.api[this.apiType].group,
        selection: []
      },
      rules: {
        itemId: [{ required: true, message: '请选择', trigger: 'blur' }],
        remark: [{ min: 0, max: 200, message: '长度不能超过200', trigger: 'blur' }]
      },

      dialog: {
        type: '',
        title: '',
        visible: false,
        form: {
          id: '',
          groupTreatExpId: '',
          groupTreatExpSubitem: '',
          groupingTreatId: '',
          itemId: '',
          amount: undefined,
          remark: '',
          codeType: ''
        },
        rules: {
          icd10Id: [{ required: true, message: '请选择', trigger: 'blur' }],
          remark: [{ min: 0, max: 200, message: '长度不能超过200', trigger: 'blur' }]
        }
      },
      list: {
        zlList: []
      }
    }
  },

  watch: {
    groupingTreatId(val) {
      if (val) {
        this.$nextTick(() => {
          this.getAllTable()
        })
      } else {
        this.clearAllTable()
      }
    },
    groupTreatExpSubitem(val) {
      if (val) {
        this.$nextTick(() => {
          this.getAllTable()
        })
      } else {
        this.clearAllTable()
      }
    },
    groupTreatExpId(val) {
      if (val) {
        this.$nextTick(() => {
          this.getAllTable()
        })
      } else {
        this.clearAllTable()
      }
    }
  },
  mounted() {
    this.$nextTick(() => {
      if (this.groupingTreatId || this.groupTreatExpSubitem || this.groupTreatExpId) {
        this.getAllTable()
      } else {
        this.clearAllTable()
      }
    })
  },
  methods: {
    // 加载诊疗项目的表格
    getAllTable() {
      this.getTable('table_jc')
      this.getTable('table_jy')
      this.getTable('table_zl')
      this.getTable('table_ss')
      this.getTable('table_hc')
    },
    // 清空诊疗项目的表格
    clearAllTable() {
      this.$refs.table_jc.clearTable()
      this.$refs.table_jy.clearTable()
      this.$refs.table_zl.clearTable()
      this.$refs.table_ss.clearTable()
      this.$refs.table_hc.clearTable()
    },

    add(table) {
      kindo.util.promise(() => {
        this.dialog.visible = true
        this.dialog.type = table
      }).then(() => {
        this.$refs.form.resetFields()
        this.dialog.form.id = ''
        this.dialog.form.codeType = this[table].search.codeType
        this.dialog.form.groupingTreatId = this.groupingTreatId
        this.dialog.form.groupTreatExpSubitem = this.groupTreatExpSubitem
        this.dialog.form.groupTreatExpId = this.groupTreatExpId
        this.$refs.focusSelect.focus()
      })
    },

    update(table, row) {
      kindo.util.promise(() => {
        this.dialog.visible = true
        this.dialog.type = table
      }).then(() => {
        this.$refs.form.resetFields()
      }).then(() => {
        this.dialog.form.id = row.id
        this.dialog.form.itemId = row.itemId
        this.dialog.form.remark = row.remark
        this.dialog.form.itemName = row.itemName
        this.dialog.form.amount = row.amount || undefined
        this.dialog.form.codeType = row.codeType
        this.list.zlList = [{ label: row.itemName, value: row.itemId, code: row.itemCode }]
        this.dialog.form.groupingTreatId = this.groupingTreatId
        this.dialog.form.groupTreatExpSubitem = this.groupTreatExpSubitem
        this.dialog.form.groupTreatExpId = this.groupTreatExpId
        this.$refs.focusInput.focus()
      })
    },

    save() {
      this.$refs.form.validate(valid => {
        if (valid) {
          if (this.dialog.form.id) {
            this.$http.put(this[this.dialog.type].url, this.dialog.form).then(res => {
              kindo.util.alert(res.message, '提示', 'success')
              this.dialog.visible = false
              this.getTable(this.dialog.type)
            })
          } else {
            let params = []
            for (let i = 0; i < this.dialog.form.itemId.length; i++) {
              params.push(Object.assign({}, this.dialog.form, { itemId: this.dialog.form.itemId[i] }))
            }
            console.log(params, config.api.batchAdd)
            this.$http.post(config.api.batchAdd, params).then(res => {
              if (res.code === 200) {
                kindo.util.alert(res.message, '提示', 'success')
                this.dialog.visible = false
                this.getTable(this.dialog.type)
              }
            })
          }
        }
      })
    },

    // 诊疗项目远程查询
    getZlTList(val) {
      let param = { rows: 200, itemName: val }
      this.$http.get(this.api.medicalTreatment, { params: param }).then(res => {
        this.list.zlList =
          res.data.rows.map(item => {
            return { label: item.itemName, value: item.id, code: item.itemCode }
          }) || []
      })
    }
  }
}
</script>