/*@Author: zhengtian
 * @Desc: 合理用药规则 -> 人群禁忌
 */
<template>
  <div :parentRow="parentRow" :isOpen="isOpen">
    <kindo-box :title="table.title + '人群禁忌'">
      <kindo-table ref="table" :url="table.url" :queryParam="table.search" @selection-change="(selection) => tableChange('table', selection)" :pageSize="5">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="禁忌人群" fixed="left" prop="ageName" width="120" show-overflow-tooltip></el-table-column>
        <el-table-column label="年龄" prop="secDrugCode" width="120" show-overflow-tooltip>
          <template slot-scope="scope">
            {{showAge(scope.row.minAge, scope.row.maxAge, scope.row.unit)}}
          </template>
        </el-table-column>
        <el-table-column label="症状" prop="symptomName" min-width="120" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="作用" prop="effect" min-width="120" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status' :filters="columnFilters(dict.AUDIT_STATUS)" :filter-method="filterHandler" :filter-multiple="false" filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>{{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update('table', scope.row.id)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('table', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-search" type="text" @click="getTable('table')">查询</el-button>
        <el-button icon="el-icon-plus" type="text" @click="add('table', 'drugCode','tableForm')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('table')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="audit( 'table')">审核</el-button>
      </div>
    </kindo-box>
    <!-- 子表新增适应症-->
    <el-dialog top="0" :visible.sync="table.dialog.visible" :title="table.dialog.title+'人群禁忌'" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="table.form" :rules="table.rules" onsubmit="return false;" label-width="90px" ref="tableForm">
        <el-form-item label="禁忌人群" prop="kbmsAgeId">
          <el-select v-model.trim="table.form.kbmsAgeId" clearable filterable placeholder="请选择" @change="populationChange">
            <el-option v-for="item in population" :key="item.id" :label="item.name" :value="item.id"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="作用" prop="">
          <el-input v-model.trim="table.form.effect"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('table')">保 存</el-button>
        <el-button @click="table.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 子表新增适应症-->
  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  mixins: [tableOpra],
  name: 'todo-table',
  props: {
    parentRow: Object,
    isOpen: Boolean
  },
  data() {
    return {
      dict: {
        // 审核状态
        AUDIT_STATUS: [],
        // 年龄单位
        PEOPLE_UNIT: []
      },
      population: [],
      table: {
        title: '',
        url: config.api.people,
        selection: [],
        dialog: {
          visible: false,
          title: '新增'
        },
        formAge: '',
        form: {
          id: '',
          kbmsAgeId: '',
          effect: '',
          popType: ''
        },
        rules: {
          kbmsAgeId: [{ required: true, message: '请选择禁忌人群', trigger: 'blur' }]
        },
        search: {
          drugCode: ''
        }
      }
    }
  },
  methods: {
    init() {
      if (this.parentRow.drugCode) {
        this.table.form.drugCode = this.parentRow.drugCode
        this.table.search.drugCode = this.parentRow.drugCode
        this.table.title = this.parentRow.genericName
        this.getTable('table')
      } else {
        this.$refs.table.clearTable()
      }
    },
    showAge(min, max, unit) {
      let unitName = kindo.dictionary.getLabel(this.dict.PEOPLE_UNIT, unit)
      if (min === null && max !== null) {
        return `0-${max}${unitName}`
      } else if (max === null && min !== null) {
        return `大于${max}${unitName}`
      } else if (min === 0 && max === 0) {
        return ''
      } else {
        return `${min}-${max}${unitName}`
      }
    },
    populationChange(val) {
      let data = this.population.filter(item => item.id === val)[0]
      this.table.form.popType = data.popType
    },
    // 查询人群所有数据，用于新增禁忌人群下拉列表
    getPopulation() {
      this.$http.get(config.api.population, { params: { status: 1 } }).then(res => {
        this.population = res.data
      })
    }
  },
  created() {
    this.getDictionary()
  },
  watch: {
    isOpen(val) {
      if (!kindo.validate.isEmpty(this.$refs.table)) {
        this.$refs.table.doLayout('table')
      }
    },
    parentRow(val) {
      this.init()
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.init()
      this.getPopulation()
    })
  }
}
</script>