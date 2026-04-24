/*
 * @Author: 吴慧慧 
 * @Date: 2020-05-26 16:49:34 
 * @Last Modified by:   吴慧慧 
 * 菜单：药品相互作用
 * @Last Modified time: 2020-05-26 16:49:34 
 */

<template>
  <div>
    <!-- 药品相互作用 start -->
    <kindo-box title="查询条件">
      <el-form :model="parent.search" onsubmit="return false;" inline @keyup.enter.prevent.native="getTable('parent')">
        <el-form-item label="药品">
          <el-input v-model="parent.search.hcDrugName" placeholder="请输入编码或名称"></el-input>
        </el-form-item>
        <el-form-item label="药品类型">
          <el-select clearable v-model="parent.search.drugKind" placeholder="请选择">
            <el-option v-for="item in dict.DRUG_KIND" :key="item.value" :label="item.label" :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button type="primary" icon="el-icon-search" @click="getTable('parent')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="药品相互作用">
      <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" :extendOption="extend"
        @selection-change="(selection) => tableChange('parent', selection)" @current-change="tableClick" :pageSize="5">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="药品编码" prop="hcDrugCode" fixed="left" min-width="120" header-align="center"
          sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="药品名称" prop="hcDrugName" fixed="left" min-width="200" header-align="center"
          sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="剂型" prop="dosageName" min-width="120" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="药品类型" prop="drugKind" :formatter="(r,c,v)=>kindo.dictionary.getLabel(dict.DRUG_KIND,v)"
          width="100" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="周期" prop="period" width="90" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope">
            <span>{{scope.row.period+kindo.dictionary.getLabel(dict.PERIOD_UNIT_TYPE,scope.row.unit)}} </span>
          </template>
        </el-table-column>
        <el-table-column label="描述" prop="remark" min-width="200" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column align="center" label="操作" width="100" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update('parent', scope.row, 'parentForm')"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('parent', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="insert('parent')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('parent')">删除</el-button>
      </div>
    </kindo-box>
    <!-- 药品相互作用 end -->

    <!-- 子表 start -->
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="child.search" onsubmit="return false;" label-position="right" inline
        @keyup.enter.prevent.native="getTable('child')">
        <el-form-item label="分组">
          <el-input v-model.trim="child.search.gruopingName" placeholder="输入名称或编码" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" :disabled="child.search.drugInteractionsId === ''"
          @click="getTable('child')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="药品相互作用规则">
      <kindo-table ref="child" :url="child.url" :queryParam="child.search"
        @selection-change="(selection) => tableChange('child', selection)" :pageSize="5">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="分组编码" fixed="left" prop="groupingCode" width="140" header-align="center"
          sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="分组名称" fixed="left" prop="gruopingName" min-width="160" header-align="center"
          sortable='custom' show-overflow-tooltip></el-table-column>
        <!-- <el-table-column label="审核状态" prop="status" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>
              {{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column> -->
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="查看" placement="top-start">
              <el-button type="text" icon="el-icon-view" @click="viewDetail(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update('child', scope.row, 'childForm')"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('child', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" :disabled="child.search.drugInteractionsId === ''"
          @click="insert('child')">新增
        </el-button>
        <el-button icon="el-icon-delete" type="text" :disabled="child.search.drugInteractionsId === ''"
          @click="remove('child')">
          删除</el-button>
        <!-- <el-button icon="el-icon-view" type="text" :disabled="child.search.drugInteractionsId === ''"
          @click="audit('child')">审核
        </el-button> -->
      </div>
    </kindo-box>
    <!-- 子表 end -->

    <!-- 主表新增 start -->
    <el-dialog v-drag top="0" :visible.sync="parent.dialog.visible" :title="(parent.form.id?'编辑':'新增') + '药品相互作用规则'"
      :close-on-click-modal="false">
      <el-form :model="parent.form" onsubmit="return false;" class="box" ref="parentForm" :rules="parent.rules"
        label-width="90px" label-position="right">
        <el-form-item label="药品名称" prop="hcDrugCode">
          <el-select v-model.trim="parent.form.hcDrugCode" :disabled="parent.form.id!==''" size="mini"
            @blur="(ev)=>{blurSel(ev,parent.form,'hcDrugCode','commonDrugList')}" placeholder="请输入选择" clearable
            filterable :loading="loading" remote :remote-method="getDictRemote">
            <li class="title">
              <span>代码值</span>
              <span>代码标题</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in list.commonDrugList" :key="item.value" :label="item.label" :value="item.value">
              <span>{{ item.value }}</span>
              <span>{{ item.label }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="剂型:" prop="dosageName" v-if="parent.form.id">
          {{parent.form.dosageName}}
        </el-form-item>
        <el-form-item label="药品类型:" prop="drugKind" v-if="parent.form.id">
          {{kindo.dictionary.getLabel(dict.DRUG_KIND,parent.form.drugKind)}}
        </el-form-item>
        <el-form-item label="周期: " prop="period">
          <el-input style="width:125px" type='number' v-model="parent.form.period"></el-input>
          <el-select style="width:180px" v-model="parent.form.unit">
            <el-option v-for='(item,index) in dict.PERIOD_UNIT_TYPE' :key='index' :label='item.label'
              :value='item.value'></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="remark">
          <el-input type="textarea" :rows="2" placeholder="可输入200文字" v-model.trim="parent.form.remark"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('parent')">保 存</el-button>
        <el-button @click="parent.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 主表新增 end -->
    <!-- 子表新增 start -->
    <el-dialog v-drag top="0" :visible.sync="child.dialog.visible" :title="(child.form.id?'编辑':'新增') + '药品相互作用规则'">
      <el-form :model="child.form" onsubmit="return false;" class="box" ref="childForm" :rules="child.rules"
        label-width="90px" label-position="right">
        <el-form-item label="分组名称" prop="gruopingName">
          <el-input v-model="child.form.gruopingName" placeholder="请输入" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('child')">保 存</el-button>
        <el-button @click="child.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 子表新增 end -->

    <!-- 分组详情 start -->
    <el-dialog :title="detail.title" :visible.sync="detail.visible" width="90%" :close-on-click-modal="false" top="0">
      <kindo-box title="查询条件">
        <el-form :model="detail.search" ref="detailSearch" onsubmit="return false;" label-position="right" inline
          @keyup.enter.prevent.native="getTable('detail')" label-width="70px">
          <el-form-item label="药品" prop="hcDrugName">
            <el-input v-model="detail.search.hcDrugName" placeholder="请输入编码或名称"></el-input>
          </el-form-item>
          <el-form-item label="剂型" prop="dosageName">
            <el-input v-model="detail.search.dosageName"></el-input>
          </el-form-item>
          <el-form-item label="药品类型" prop="drugKind">
            <el-select clearable v-model="detail.search.drugKind" placeholder="请选择">
              <el-option v-for="item in dict.DRUG_KIND" :key="item.value" :label="item.label" :value="item.value">
              </el-option>
            </el-select>
          </el-form-item>
        </el-form>
        <div slot="control">
          <el-button icon="el-icon-search" type="primary" @click="getTable('detail')">查询</el-button>
        </div>
      </kindo-box>
      <kindo-box title=" ">
        <kindo-table ref="detail" :url="detail.url" :queryParam="detail.search"
          @selection-change="(selection) => tableChange('detail', selection)" :pageSize="5">
          <el-table-column type="selection" fixed="left" width="30"></el-table-column>
          <el-table-column label="药品编码" fixed="left" prop="hcDrugCode" width="140" header-align="center"
            sortable='custom' show-overflow-tooltip></el-table-column>
          <el-table-column label="药品名称" fixed="left" prop="hcDrugName" min-width="160" header-align="center"
            sortable='custom' show-overflow-tooltip></el-table-column>
          <el-table-column label="剂型" prop="dosageName" min-width="120" header-align="center" show-overflow-tooltip>
          </el-table-column>
          <el-table-column label="药品类型" prop="drugKind"
            :formatter="(r,c,v)=>kindo.dictionary.getLabel(dict.DRUG_KIND,v)" width="100" header-align="center"
            show-overflow-tooltip>
          </el-table-column>
          <el-table-column label="描述" prop="remark" min-width="200" header-align="center" show-overflow-tooltip>
          </el-table-column>
          <el-table-column label="审核状态" prop="status" width="100" align="center">
            <template slot-scope="scope">
              <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>
                {{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" align="center" fixed="right">
            <template slot-scope="scope">
              <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
                <el-button type="text" icon="el-icon-edit" @click="update('detail', scope.row, 'detailForm')">
                </el-button>
              </el-tooltip>
              <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
                <el-button type="text" icon="el-icon-delete" @click="remove('detail', scope.row.id)"></el-button>
              </el-tooltip>
            </template>
          </el-table-column>
        </kindo-table>
        <div slot="control">
          <el-button icon="el-icon-plus" type="text" @click="insert('detail')">新增</el-button>
          <el-button icon="el-icon-delete" type="text" @click="remove('detail')">删除</el-button>
          <el-button icon="el-icon-view" type="text" @click="audit('detail')">审核</el-button>
        </div>
      </kindo-box>
    </el-dialog>
    <!-- 分组详情 end -->

    <!-- 分组详情新增/编辑 start -->
    <el-dialog v-drag top="0" :visible.sync="detail.dialog.visible" :title="(detail.form.id?'编辑':'新增') + '药品规则'"
      :close-on-click-modal="false">
      <el-form :model="detail.form" onsubmit="return false;" class="box" ref="detailForm" :rules="detail.rules"
        label-width="90px" label-position="right">
        <el-form-item label="药品名称" prop="hcDrugCode">
          <el-select v-model.trim="detail.form.hcDrugCode" :disabled="detail.form.id!==''" size="mini"
            @blur="(ev)=>{blurSel(ev,detail.form,'hcDrugCode','commonDrugList')}" placeholder="请输入选择" clearable
            filterable :loading="loading" remote :remote-method="getDictRemote">
            <li class="title">
              <span>代码值</span>
              <span>代码标题</span>
            </li>
            <li class="tip">
              <span>
                &lt;请选择&gt;
              </span>
            </li>
            <el-option v-for="item in list.commonDrugList" :key="item.value" :label="item.label" :value="item.value">
              <span>{{ item.value }}</span>
              <span>{{ item.label }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="剂型:" prop="dosageName" v-if="detail.form.id">
          {{detail.form.dosageName}}
        </el-form-item>
        <el-form-item label="药品类型:" prop="drugKind" v-if="detail.form.id">
          {{kindo.dictionary.getLabel(dict.DRUG_KIND,detail.form.drugKind)}}
        </el-form-item>
        <el-form-item label="描述" prop="remark">
          <el-input type="textarea" :rows="2" placeholder="可输入200文字" v-model.trim="detail.form.remark"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('detail')">保 存</el-button>
        <el-button @click="detail.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 分组详情新增/编辑 end -->
  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  mixins: [tableOpra],
  data() {
    return {
      // 主表默认选第一行数据
      extend: { selectedFirst: true },
      loading: false,
      disabled: true,
      dict: {
        AUDIT_STATUS: [],
        PERIOD_UNIT_TYPE: [],
        DRUG_KIND: []
      },
      list: {
        commonDrugList: []
      },

      parent: {
        url: config.api.parent,
        selection: [],
        dialog: {
          visible: false
        },
        form: {
          id: '',
          hcDrugCode: '',
          remark: '',
          period: '',
          unit: '1',
          dosageName: '',
          drugKind: ''
        },
        rules: {
          hcDrugCode: [{ required: true, message: '请输入名称或编码', trigger: 'blur' }],
          remark: [{ min: 0, max: 200, message: '长度不能超过200', trigger: 'blur' }],
          period: [{ required: true, message: '请输入周期值', trigger: 'blur' }, { pattern: /^[0-9]+$/, message: '请输入正整数' }]
        },
        search: {
          hcDrugName: '',
          drugKind: ''
        }
      },
      child: {
        url: config.api.child,
        selection: [],
        dialog: {
          visible: false
        },
        form: {
          id: '',
          drugInteractionsId: '',
          gruopingName: ''
        },
        rules: {
          gruopingName: [{ required: true, message: '请输入', trigger: 'blur' }]
        },
        search: {
          drugInteractionsId: '',
          gruopingName: ''
        }
      },
      detail: {
        visible: false,
        title: '',
        url: config.api.detail,
        selection: [],
        dialog: {
          visible: false
        },
        form: {
          groupingId: '',
          id: '',
          hcDrugCode: '',
          remark: '',
          dosageName: '',
          drugKind: ''
        },
        rules: {
          hcDrugCode: [{ required: true, message: '请输入名称或编码', trigger: 'blur' }],
          remark: [{ min: 0, max: 200, message: '长度不能超过200', trigger: 'blur' }],
          period: [{ required: true, message: '请输入周期值', trigger: 'blur' }, { pattern: /^[0-9]+$/, message: '请输入正整数' }]
        },
        search: {
          groupingId: '',
          hcDrugName: '',
          dosageName: '',
          drugKind: ''
        }
      }
    }
  },
  methods: {
    // 获取父表信息
    getTable(table) {
      if (table === 'parent') {
        this.$refs.parent.reloadData().then(res => {
          if (res.data.total > 0) {
            this.$refs.parent.setCurrentRowIndex(0)
          } else {
            this.$refs.child.clearTable()
            this.child.form.drugInteractionsId = ''
            this.child.search.drugInteractionsId = ''
          }
        })
      } else {
        // 获取字表信息
        if (this.child.form.drugInteractionsId) {
          this.$refs[table].reloadData()
        }
      }
    },

    tableClick(row) {
      if (row) {
        this.child.form.drugInteractionsId = row.id
        this.child.search.drugInteractionsId = row.id
        this.getTable('child')
      }
    },

    // 药品远程查询
    getDictRemote(searchVal) {
      let param = { rows: 100, hcGenericName: searchVal }
      this.$http.get(config.api.drugQuery, { params: param }).then(res => {
        this.list.commonDrugList =
          res.data.rows.map(item => {
            return { label: item.hcGenericName, value: item.hcDrugCode }
          }) || []
      })
    },

    insert(name) {
      if (name === 'parent') {
        this.add(name, 'unit', 'parentForm')
      } else if (name === 'child') {
        this.add(name, 'drugInteractionsId', 'childForm')
      } else {
        this.add(name, 'groupingId', 'detailForm')
      }
      this.list.commonDrugList = []
    },

    update(table, row, refForm) {
      kindo.util.promise(() => {
        this[table].dialog.visible = true
      }).then(() => {
        this.$refs[refForm].resetFields()
        this.list.commonDrugList = []
      }).then(() => {
        for (var key in row) {
          if (this[table].form.hasOwnProperty(key) === true) {
            this[table].form[key] = row[key]
          }
        }
        if (table !== 'child') {
          this.list.commonDrugList.push({ label: row.hcDrugName, value: row.hcDrugCode })
        }
      })
    },

    // 查看分组详情
    viewDetail(row) {
      this.detail.title = row.gruopingName
      this.detail.form.groupingId = row.id
      this.detail.search.groupingId = row.id
      this.detail.visible = true
      this.$nextTick(() => {
        this.$refs.detailSearch.resetFields()
        this.getTable('detail')
      })
    }
  },
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