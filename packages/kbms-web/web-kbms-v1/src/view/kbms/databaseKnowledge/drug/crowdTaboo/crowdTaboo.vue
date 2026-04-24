/*
 * @Author: 吴慧慧 
 * @Date: 2020-05-26 16:48:01 
 * @Last Modified by:   吴慧慧 
 * 菜单：人群禁忌
 * @Last Modified time: 2020-05-26 16:48:01 
 */
<template>
  <div>
    <!-- 诊疗项目禁忌症规则表 start -->
    <kindo-box title="查询条件">
      <el-form :model="table.search" onsubmit="return false;" inline @keyup.enter.prevent.native="get">
        <el-form-item label="药品名称">
          <el-input v-model="table.search.hcDrugName"></el-input>
        </el-form-item>
        <el-form-item label="禁忌人群">
          <el-select v-model="table.search.kbmsAgeName" clearable>
            <el-option v-for="item in list.population" :key="item.value" :label="item.label" :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="剂型">
          <el-input v-model="table.search.dosageName"></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button type="primary" icon="el-icon-search" @click="get">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="人群禁忌规则">
      <kindo-table ref="table" :url="table.url" :queryParam="table.search"
        @selection-change="(selection) => tableChange('table', selection)">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="药品编码" prop="hcDrugCode" fixed="left" min-width="120" header-align="center"
          sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="药品名称" prop="hcDrugName" fixed="left" min-width="200" header-align="center"
          sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="剂型" prop="dosageName" min-width="70" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="禁忌条件" prop="kbmsAgeName" min-width="200" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="描述" prop="remark" min-width="200" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>
              {{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column align="center" label="操作" width="100" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('table', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="insert">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('table')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="audit('table')">审核</el-button>
      </div>
    </kindo-box>
    <!-- 诊疗项目禁忌症规则表 end -->

    <!-- 主表新增 start -->
    <el-dialog v-drag top="0" :visible.sync="table.dialog.visible" :title="(table.form.id?'编辑':'新增') + '诊疗项目'"
      :close-on-click-modal="false">
      <el-form :model="table.form" onsubmit="return false;" class="box" ref="tableForm" :rules="table.rules"
        label-width="90px" label-position="right">
        <el-form-item label="药品名称" prop="hcDrugCode">
          <el-select v-model.trim="table.form.hcDrugCode" :disabled="table.form.id !== ''" size="mini"
            @blur="(ev)=>{blurSel(ev,table.form,'hcDrugCode','commonDrugList')}" placeholder="请输入选择" clearable
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
        <el-form-item label="剂型:" prop="dosageName" v-if="table.form.id">
          {{table.form.dosageName}}
        </el-form-item>
        <el-form-item label="禁忌人群" prop="kbmsAgeId">
          <el-select v-model="table.form.kbmsAgeId">
            <el-option v-for="item in list.population" :key="item.value" :label="item.label" :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="remark">
          <el-input type="textarea" :rows="2" placeholder="可输入200文字" v-model.trim="table.form.remark"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('table')">保 存</el-button>
        <el-button @click="table.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 主表新增 end -->
  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  mixins: [tableOpra],
  data() {
    return {
      loading: false,
      disabled: true,
      dict: {
        AUDIT_STATUS: []
      },
      list: {
        population: [],
        commonDrugList: []
      },

      table: {
        url: config.api.table,
        selection: [],
        dialog: {
          visible: false
        },
        form: {
          id: '',
          hcDrugCode: '',
          dosageName: '',
          remark: '',
          kbmsAgeId: ''
        },
        rules: {
          hcDrugCode: [{ required: true, message: '请输入名称或编码', trigger: 'blur' }],
          remark: [{ min: 0, max: 200, message: '长度不能超过200', trigger: 'blur' }],
          kbmsAgeId: [{ required: true, message: '请选择', trigger: 'blur' }]
        },
        search: {
          dosageName: '',
          hcDrugName: '',
          kbmsAgeName: ''
        }
      }
    }
  },
  methods: {
    // 获取父表信息
    get() {
      this.$refs.table.reloadData()
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

    insert() {
      this.add('table', 'unit', 'tableForm')
      this.list.commonDrugList = []
    },

    update(row) {
      kindo.util.promise(() => {
        this.table.dialog.visible = true
      }).then(() => {
        this.$refs.tableForm.resetFields()
        this.list.commonDrugList = []
      }).then(() => {
        for (var key in row) {
          if (this.table.form.hasOwnProperty(key) === true) {
            this.table.form[key] = row[key]
          }
        }
        this.list.commonDrugList.push({ label: row.hcDrugName, value: row.hcDrugCode })
      })
    }
  },
  created() {
    // 查询禁忌人群下拉列表
    this.$http.get(config.api.xzTj).then(res => {
      this.list.population =
        res.data.map(item => {
          let temObj = {
            label: item.name,
            value: item.id
          }
          return temObj
        }) || []
    })
    this.getDictionary()
  },
  mounted() {
    this.$nextTick(() => {
      this.get()
    })
  }
}
</script>