/*  @Author: zhengtian
 * @Date: 2018-04-08
 * @Desc: 合理用药规则
 */
<template>
  <div>
    <!-- 父表 -->
    <kindo-box title="查询条件">
      <el-form v-model.trim="parent.search" onsubmit="return false;" label-position="right" inline @keyup.enter.prevent.native="getTable('parent')">
        <el-form-item label="药品名称">
          <el-input v-model.trim="parent.search.genericName" placeholder="" clearable></el-input>
        </el-form-item>
        <el-form-item label="剂型">
          <el-input v-model.trim="parent.search.dosageName" placeholder="" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getTable('parent')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="合理用药规则信息">
      <!--  @current-change="(row) => tableClick('childIndic', 'drugCode', row)"  -->
      <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" :extendOption="extend" @selection-change="(selection) => tableChange('parent', selection)" @current-change="tableClick" :pageSize="kindo.config.VERSION === 'company'?5:undefined">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="药品名称" fixed="left" prop="genericName" min-width="120" header-align="center">
          <template slot-scope="scope">
            <el-button type="text" @click="genericTable(scope.row.id)">{{scope.row.genericName}}</el-button>
          </template>
        </el-table-column>
        <el-table-column label="剂型" prop="dosageName" min-width="120" header-align="center"></el-table-column>
        <el-table-column label="单位（重量）" min-width="140" header-align="center">
          <template slot-scope="scope">
            <span v-show="!kindo.validate.isEmpty(scope.row.weightValue) && scope.row.weightValue !== 0">
              {{scope.row.weightValue + scope.row.weightUnit}}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="单位（剂型）" min-width="140" header-align="center">
          <template slot-scope="scope">
            <span v-show="!kindo.validate.isEmpty(scope.row.dosageFormValue) && scope.row.dosageFormValue !==0">
              {{scope.row.dosageFormValue + scope.row.dosageFormUnit}}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="最小封装" min-width="160" header-align="center">
          <template slot-scope="scope">
            <span v-show="!kindo.validate.isEmpty(scope.row.minPackagingValue) && scope.row.minPackagingValue !==0">
              {{scope.row.minPackagingValue + scope.row.minPackagingUnit}}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="最大封装" min-width="160" header-align="center">
          <template slot-scope="scope">
            <span v-show="!kindo.validate.isEmpty(scope.row.maxPackagingValue) && scope.row.maxPackagingValue !==0">
              {{scope.row.maxPackagingValue + scope.row.maxPackagingUnit}}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="单位相互关系" prop="unitRelation" width="120" :formatter="(r,c,v) => kindo.dictionary.getLabel(RALET, v)" header-align="center"></el-table-column>
        <el-table-column label="操作" width="90" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="editParent(scope.row)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="刪除" placement="top-start">
              <el-button type="text" icon="el-icon-s-release" @click="cancelPush(scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-view" type="text" @click="batch('selection', 'parent', 'audit')">审核</el-button>
      </div>
    </kindo-box>
    <!-- {{parent.clickRow}} -->
    <el-tabs v-model.trim="tabsActive" @tab-click="tabChange" type="card" v-if="kindo.config.VERSION === 'company'">
      <el-tab-pane label="超量规则" name="fifth">
        <todo-excess :parentRow="parent.clickRow" :isOpen="tabsStatus.fifth"></todo-excess>
      </el-tab-pane>
      <el-tab-pane label="适应症" name="first">
        <todo-indication :parentRow="parent.clickRow" :isOpen="tabsStatus.first"></todo-indication>
      </el-tab-pane>
      <el-tab-pane label="成份" name="second">
        <todo-ingredient :parentRow="parent.clickRow" :isOpen="tabsStatus.second"></todo-ingredient>
      </el-tab-pane>
      <el-tab-pane label="疾病禁忌" name="four">
        <todo-disease :parentRow="parent.clickRow" :isOpen="tabsStatus.four"></todo-disease>
      </el-tab-pane>
      <el-tab-pane label="人群禁忌" name="third">
        <todo-people :parentRow="parent.clickRow" :isOpen="tabsStatus.third"></todo-people>
      </el-tab-pane>
    </el-tabs>

    <!-- 主表编辑弹框 -->
    <el-dialog v-drag top="0" :visible.sync="parent.visible2" title="合理用药规则编辑" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form v-model.trim="parent.editForm" onsubmit="return false;" label-position="right" label-width="110px" @keyup.enter.prevent.native="saveEdit">
        <el-form-item label="药品名称" prop="genericName">
          {{parent.editForm.genericName}}
        </el-form-item>
        <el-form-item label="单位相互关系" prop="unitRelation">
          <el-select v-model.trim="parent.editForm.unitRelation">
            <el-option v-for="(item,index) in RALET" :key="index" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="saveEdit">保存</el-button>
        <el-button @click="parent.visible2 = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 主表编辑弹框 -->

    <!-- 主表弹框 -->
    <el-dialog v-drag top="0" :visible.sync="parent.dialog.visible" title="医院药品信息" :modal-append-to-body="false" :close-on-click-modal="false" width="60%">
      <el-form v-model.trim="generic.search" onsubmit="return false;" label-position="right" label-width="80px" inline @keyup.enter.prevent.native="getTable('generic')">
        <el-form-item label="医疗机构">
          <el-input v-model.trim="generic.search.hospitalName" placeholder="" clearable></el-input>
        </el-form-item>
        <el-button icon="el-icon-search" type="primary" @click="getTable('generic')">查询</el-button>
      </el-form>
      <kindo-table ref="generic" :url="generic.url" :queryParam="generic.search" :extendOption="extend" :pageSize="5">
        <el-table-column label="医疗机构名称" prop="hospitalName" min-width="120" header-align="center"></el-table-column>
        <el-table-column label="医院药品编码" prop="hcCatalogueCode" min-width="120" header-align="center"></el-table-column>
        <el-table-column label="医院药品名称" prop="hcCatalogueName" min-width="120" header-align="center"></el-table-column>
        <el-table-column label="剂型" prop="dosageForm" min-width="120" header-align="center"></el-table-column>
        <el-table-column label="规格" prop="spec" min-width="120" header-align="center"></el-table-column>
        <el-table-column label="生产厂家" prop="manufacturer" min-width="120" header-align="center"></el-table-column>
      </kindo-table>
      <div slot="footer" class="dialog-footer">
        <el-button @click="parent.dialog.visible = false" icon="el-icon-close" type="primary">关 闭</el-button>
      </div>
    </el-dialog>
    <!-- 主表弹框 -->
  </div>
</template>

<script>
import config from './config/index.js'
import mixin from '@src/utils/helper/tableMixIn.js'
// 适应症
import todoIndication from './todoIndication'
import todoExcess from './todoExcess'
import todoPeople from './todoPeople'
import todoDisease from './todoDisease'
import todoIngredient from './todoIngredient'
export default {
  name: 'drugRule',
  mixins: [mixin],
  data() {
    return {
      // 主表默认选第一行数据
      extend: { selectedFirst: true },
      loading: false,
      tabsActive: 'fifth',
      tabsStatus: {
        first: false,
        second: false,
        third: false,
        four: false,
        fifth: true
      },
      joinRow: {},
      selection: [],
      RALET: [
        { label: '递进', value: '1' },
        { label: '平行', value: '2' }
      ],
      parent: {
        url: config.api.parent,
        dialog: {
          visible: false,
          title: '新增'
        },
        visible2: false,
        editForm: {
          id: '',
          genericName: '',
          unitRelation: '1'
        },
        search: {
          genericName: '',
          dosageName: '',
          pushStatus: '1'
        },
        clickRow: {}
      },
      generic: {
        url: config.api.generic,
        search: {
          drugId: '',
          hospitalName: ''
        }
      }
    }
  },
  methods: {
    // 查询
    getTable(table) {
      this.$refs[table].reloadData()
    },
    tableChange(table, selection) {
      this.selection = selection
    },
    tabChange(tab) {
      for (let k in this.tabsStatus) {
        if (k === tab.name) {
          this.tabsStatus[k] = true
        } else {
          this.tabsStatus[k] = false
        }
      }
    },
    tableClick(row) {
      if (row) {
        this['parent'].clickRow = row
        if (this.tabsStatus[this.tabsActive]) {
          this.tabsStatus[this.tabsActive] = false
        } else {
          this.tabsStatus[this.tabsActive] = true
        }
      } else {
        this['parent'].clickRow = {}
      }
    },
    genericTable(id) {
      kindo.util
        .promise(() => {
          this.parent.dialog.visible = true
          this.generic.search.drugId = id
          this.generic.search.hospitalName = ''
        })
        .then(() => {
          this.getTable('generic')
        })
    },

    editParent(row) {
      kindo.util.promise(() => {
        this.parent.visible2 = true
      }).then(() => {
        this.parent.editForm.id = row.id
        this.parent.editForm.genericName = row.genericName
        this.parent.editForm.unitRelation = row.unitRelation || '1'
      })
    },
    saveEdit() {
      this.$http.put(config.api.editParent, this.parent.editForm).then(res => {
        kindo.util.alert(res.message, '提示', 'success')
        this.parent.visible2 = false
        this.getTable('parent')
      })
    },

    // 取消推送
    cancelPush(row) {
      kindo.util.confirm('请确定是否刪除 ', undefined, undefined, () => {
        this.$http.put(config.api.cancelPush, { id: row.id }).then(res => {
          kindo.util.alert(res.message, '提示', 'success')
          this.getTable('parent')
        })
      })
    }
  },
  created() { },

  mounted() {
    this.$nextTick(() => {
      this.getTable('parent')
    })
  },
  components: {
    'todo-indication': todoIndication,
    'todo-excess': todoExcess,
    'todo-people': todoPeople,
    'todo-disease': todoDisease,
    'todo-ingredient': todoIngredient
  }
}
</script>