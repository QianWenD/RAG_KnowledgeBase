/* @Author: lilizhou
 * 菜单：基础库-药品-医保药品目录
 */

<template>
  <div>
    <kindo-box title="医保药品目录" icon="xx">
      <el-form :model="search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="药品名称">
          <el-input v-model.trim="search.hcCatalogueName" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="医保药品目录信息">
      <kindo-table ref="table" class="expandTable" :url="url" :queryParam="search" @selection-change="(selection) => selectionChange(selection, 'selection')">
        <el-table-column type="expand" fixed="left">
          <template slot-scope="scope">
            <el-form label-position="left" inline class="demo-table-expand">
              <el-form-item label="收费项目等级">
                <span> {{kindo.dictionary.getLabel(dict.CHARGE_LEVEL,scope.row.chargeLevel)}}</span>
              </el-form-item>
              <el-form-item label="最高价格(元)">
                <span>{{ scope.row.highestPrice }}</span>
              </el-form-item>
              <el-form-item label="商品价格(元)">
                <span>{{ scope.row.price }}</span>
              </el-form-item>
            </el-form>
          </template>
        </el-table-column>
        <el-table-column label="医保药品编码" fixed="left" prop="hcCatalogueCode" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="药品名称" fixed="left" prop="hcCatalogueName" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="药品商品名称" prop="proprietaryName" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="剂型" prop="dosageForm" min-width="120" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="备注" prop="remark" min-width="120" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="药品种类" prop="drugKind" width="120" align="center">
          <template slot-scope="scope">
            {{kindo.dictionary.getLabel(dict.DRUG_KIND,scope.row.drugKind)}}
          </template>
        </el-table-column>
        <!-- <el-table-column label="收费项目等级" prop="chargeLevel" width="140" align="center"> -->
        <!-- <template slot-scope="scope"> -->
        <!-- {{kindo.dictionary.getLabel(dict.CHARGE_LEVEL,scope.row.chargeLevel)}} -->
        <!-- </template> -->
        <!-- </el-table-column> -->
        <!-- <el-table-column label="最高价格(元)" prop="highestPrice" min-width="120" header-align="center" align="right" sortable='custom' show-overflow-tooltip></el-table-column> -->
        <!-- <el-table-column label="商品价格(元)" prop="price" min-width="120" header-align="center" align="right" sortable='custom' show-overflow-tooltip></el-table-column> -->
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" @click="showMore(scope.row)">查看详情</el-button>
          </template>
        </el-table-column>
      </kindo-table>
      <!-- <div slot="control">
        <el-button icon="el-icon-plus" type="primary" @click="insert('visible', 'form')">新增</el-button>
        <el-button icon="el-icon-delete" type="primary" @click="batch('selection', 'table', 'delete')">删除</el-button>
        <el-button icon="el-icon-view" type="primary" @click="batch('selection', 'table', 'audit')">审核</el-button>
      </div> -->
    </kindo-box>
    <el-dialog v-drag top="0" :visible.sync="visible" :title="rowInfo.hcCatalogueName + '详情'" width="80%" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="rowInfo" label-position="right" inline label-width="140px">
        <el-form-item label="药品编码:">
          <span v-text="rowInfo.hcDrugCode"></span>
        </el-form-item>
        <el-form-item label="药品名称:">
          <span v-text="rowInfo.hcPopularName"></span>
        </el-form-item>
        <el-form-item label="药品商品名:">
          <span v-text="rowInfo.proprietaryName"></span>
        </el-form-item>
        <el-form-item label="英文名称:">
          <span v-text="rowInfo.englishName"></span>
        </el-form-item>
        <el-form-item label="最高价格:">
          <span>{{rowInfo.highestPrice?rowInfo.highestPrice + '元':''}}</span>
        </el-form-item>
        <el-form-item label="商品名价格:">
          <span>{{rowInfo.price?rowInfo.price + '元':''}}</span>
        </el-form-item>
        <el-form-item label="剂型:">
          <span v-text="rowInfo.dosageForm"></span>
        </el-form-item>
        <el-form-item label="药品种类:">
          <span>{{kindo.dictionary.getLabel(dict.DRUG_KIND,rowInfo.drugKind)}}</span>
        </el-form-item>
        <el-form-item label="收费类别:">
          <span>{{kindo.dictionary.getLabel(dict.ITEM_CHARGE_TYPE,rowInfo.chargeCategory)}}</span>
        </el-form-item>
        <el-form-item label="收费项目等级:">
          <span>{{kindo.dictionary.getLabel(dict.CHARGE_LEVEL,rowInfo.chargeLevel)}}</span>
        </el-form-item>
        <el-form-item label="儿童用药标志:">
          <span>{{kindo.dictionary.getLabel(FLAG,rowInfo.childrenFlag)}}</span>
        </el-form-item>
        <el-form-item label="自制药品标志:">
          <span>{{kindo.dictionary.getLabel(FLAG,rowInfo.homemadeFlag)}}</span>
        </el-form-item>
        <el-form-item label="处方药标志:">
          <span>{{kindo.dictionary.getLabel(FLAG,rowInfo.prescriptionFlag)}}</span>
        </el-form-item>
        <el-form-item label="门诊自付比例:">
          <span v-text="rowInfo.outpatientPayRatio"></span>
        </el-form-item>
        <el-form-item label="住院自付比例:">
          <span v-text="rowInfo.inpatientPayRatio"></span>
        </el-form-item>
        <el-form-item label="离休自付比例:">
          <span v-text="rowInfo.retiredPayRatio"></span>
        </el-form-item>
        <el-form-item label="居民门诊比例:">
          <span v-text="rowInfo.inpatientRatio"></span>
        </el-form-item>
        <el-form-item label="生育自付比例:">
          <span v-text="rowInfo.childbirthPayRatio"></span>
        </el-form-item>
        <el-form-item label="二乙自付比例:">
          <span v-text="rowInfo.secondaryLevelbPayRatio"></span>
        </el-form-item>
        <el-form-item label="工伤自付比例:">
          <span v-text="rowInfo.workRelatedInjuryPayRatio"></span>
        </el-form-item>
        <el-form-item label="居民住院比例:">
          <span v-text="rowInfo.outpatientRatio"></span>
        </el-form-item>
        <el-form-item label="离休限价:">
          <span>{{rowInfo.retiredLimitPrice?rowInfo.retiredLimitPrice + '元':''}}</span>
        </el-form-item>
        <el-form-item label="开始时间:">
          <span>{{kindo.util.formatDate(rowInfo.startTime)}}</span>
        </el-form-item>
        <el-form-item label="终止时间:">
          <span>{{kindo.util.formatDate(rowInfo.endTime)}}</span>
        </el-form-item>
        <el-form-item label="是否需要审批标志:">
          <span>{{kindo.dictionary.getLabel(FLAG,rowInfo.examineFlag)}}</span>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script>
import config from './config'
// 依赖于 table - 表格处理
import tableMixIn from '@src/utils/helper/tableMixIn.js'

export default {
  name: 'clientMedInsuraceCatelog',
  mixins: [tableMixIn],
  data() {
    return {
      url: config.api.table,
      visible: false,
      // 查询实体
      search: {
        hcCatalogueName: ''
      },
      rowInfo: {},
      // 数据字典
      FLAG: [{ label: '是', value: '1' }, { label: '否', value: '0' }],
      dict: {
        // 疾病种类
        DRUG_KIND: [],
        ITEM_CHARGE_TYPE: [],
        // 收费等级
        CHARGE_LEVEL: []
      }
    }
  },

  created() {
    this._form = Object.assign({}, this.form)
    // 获取数据字典
    this.getDict(this.dict, this.filtersDict)
  },

  mounted() {
    this.$nextTick(() => {
      this.get('table')
    })
  },

  methods: {
    showMore(row) {
      this.visible = true
      this.rowInfo = Object.assign({}, row)
    }
  }
}
</script>
<style scoped>
.label {
  width: 120px;
  display: inline-block;
  text-align: right;
}
.demo-table-expand {
  font-size: 0;
}
.demo-table-expand label {
  width: 90px;
  color: #99a9bf;
}
.demo-table-expand .el-form-item {
  margin-right: 0;
  margin-bottom: 0;
  width: 33%;
}
</style>
