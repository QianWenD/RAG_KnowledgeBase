/* @Author: wuhuihui
 *菜单：基础数据库库-诊疗-诊疗项目目录
 *遗留问题：1、导入导出待完成
 *         2、页面待对接
<template>
  <div>
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="诊疗项目">
          <el-input v-model.trim="search.itemCatalogueName" clearable placeholder="请输入名称或编码"></el-input>
        </el-form-item>
        <el-form-item label="项目内涵">
          <el-input v-model.trim="search.itemIntension" clearable></el-input>
        </el-form-item>
        <el-form-item label="收费类别">
          <el-select v-model.trim="search.chargeCategory" clearable filterable>
            <el-option v-for="(item,index) in dict.ITEM_CHARGE_TYPE" :key="index" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="收费项目等级">
          <el-select v-model.trim="search.chargeLevel" clearable filterable>
            <el-option v-for="(item,index) in dict.CHARGE_LEVEL" :key="index" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="定点医疗机构">
          <el-input v-model.trim="search.designatedMedicalInstitution" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="诊疗项目目录信息">
      <kindo-table ref="table" :url="table.url" :queryParam="search" @selection-change="(selection) => selectionChange(selection, 'selection')" :default-sort="tableSort">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="项目编码" fixed="left" prop="itemCatalogueCode" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="项目名称" fixed="left" prop="itemCatalogueName" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="项目内涵" prop="itemIntension" min-width="120" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="备注" prop="remark" min-width="240" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="收费类别" prop="chargeCategory" min-width="140" :formatter="(row, column) => kindo.dictionary.getLabel(dict.ITEM_CHARGE_TYPE,row.chargeCategory)" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="收费项目等级" prop="chargeLevel" width="140" :formatter="(row) => kindo.dictionary.getLabel(dict.CHARGE_LEVEL, row.chargeLevel)" align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="单位" prop="unit" width="90" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="特殊项目标识" prop="spec" width="160" :formatter="(row) => row.spec?row.spec==='1'?'是':'否':''" align="center" sortable='custom'></el-table-column>
        <el-table-column label="开始时间" prop="startTime" width="120" :formatter="(row) => row.startTime?kindo.util.formatDate(row.startTime):''" align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="终止时间" prop="endTime" width="120" :formatter="(row) => row.endTime?kindo.util.formatDate(row.endTime):''" align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="申报医院" prop="reportNumner" min-width="120" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="定点医疗机构" prop="designatedMedicalInstitution" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="调整标志" prop="flag" width="110" :formatter="(row,column) => kindo.dictionary.getLabel(FLAG,row.flag)" align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="是否需要审批标志" prop="examineFlag" width="170" :formatter="(row)=> row.examineFlag?row.examineFlag==='1'?'是':'否':''" align="center" sortable='custom'></el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="deleteOne(scope.row.id, 'table')"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="查看详情" placement="top-start">
              <el-button type="text" icon="el-icon-view" @click="viewDetails(scope.row)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-delete" type="text" @click="batch('selection', 'table', 'delete')">删除</el-button>
        <!-- <el-button icon="el-icon-k-sys-export" type="text" @click="exportData">导出</el-button> -->
        <!-- <el-button icon="el-icon-k-sys-import" type="text" @click="exportData">导入</el-button> -->
      </div>
    </kindo-box>
    <el-dialog v-drag top="0" :visible.sync="visible" title="诊疗项目基础数据详情" width="75%" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="form" ref="form" label-width="170px" style="height: 60vh;overflow-x: hidden; overflow-y: scroll;">
        <el-row>
          <el-col :span="8">
            <el-form-item label="项目编码：" prop="itemCatalogueCode">{{form.itemCatalogueCode}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="项目名称：" prop="itemCatalogueName">{{form.itemCatalogueName}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="特殊项目标识：" prop="spec">{{form.spec}}</el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="项目内涵：" prop="itemIntension">{{form.itemIntension}}</el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注：" prop="remark">{{form.remark}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="收费类别：">{{kindo.dictionary.getLabel(dict.ITEM_CHARGE_TYPE,form.chargeCategory)}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="收费等级：">{{kindo.dictionary.getLabel(dict.CHARGE_LEVEL,form.chargeLevel)}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单位：">{{form.unit}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="社保经办机构：" prop="socialInsuranceAgencyCode">{{form.socialInsuranceAgencyCode}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="定点医疗机构：" prop="designatedMedicalInstitution">{{form.designatedMedicalInstitution}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="申报医院：" prop="reportNumner">{{form.reportNumner}}</el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="8">
            <el-form-item label="开始时间：" prop="startTime">{{form.startTime?kindo.util.formatDate(form.startTime):''}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="终止时间：" prop="endTime">{{form.endTime?kindo.util.formatDate(form.endTime):''}}</el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="8">
            <el-form-item label="经办时间：" prop="handleString">{{form.handleString?kindo.util.formatDate(form.handleString):''}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="经办人：" prop="agentName">{{form.agentName}}</el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="8">
            <el-form-item label="省级最高价格：" prop="provincialHighestPrice">{{form.provincialHighestPrice}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="市级最高价格：" prop="municipalHighestPrice">{{form.municipalHighestPrice}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="县级最高价格：" prop="countyHighestPrice">{{form.countyHighestPrice}}</el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="8">
            <el-form-item label="县级以下价格：" prop="price">{{form.price}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="离休价格：" prop="retiredPrice">{{form.retiredPrice}}</el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="8">
            <el-form-item label="门诊自付比例：" prop="outpatientPayRatio">{{form.outpatientPayRatio}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="住院自付比例：" prop="inpatientPayRatio">{{form.inpatientPayRatio}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="离休自付比例：" prop="retiredPayRatio">{{form.retiredPayRatio}}</el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="工伤自付比例：" prop="workRelatedInjuryPayRatio">{{form.workRelatedInjuryPayRatio}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="生育自付比例：" prop="childbirthPayRatio">{{form.childbirthPayRatio}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="二乙自付比例：" prop="secondaryLevelbPayRatio">{{form.secondaryLevelbPayRatio}}</el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="居民门诊比例：" prop="outpatientRatio">{{form.outpatientRatio}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="居民住院比例：" prop="inpatientRatio">{{form.inpatientRatio}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="二乙床位限价：" prop="secondaryLevelbBedFeeLimit">{{form.secondaryLevelbBedFeeLimit}}</el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="省其他公立医院价格：" prop="provHospitalPriceOther">{{form.provHospitalPriceOther}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="省三甲医院价格：" prop="provTertiaryLevelbPrice">{{form.provTertiaryLevelbPrice}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="省非三甲医院价格：" prop="nonProvTertiaryLevelbPrice">{{form.nonProvTertiaryLevelbPrice}}</el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="郑州市公立医院限价：" prop="item">{{form.item}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="郑州区级公立医院限价：" prop="zhenzhouLimitedPrice">{{form.zhenzhouLimitedPrice}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="郑州县级公立医院限价：" prop="countyLimitedPrice">{{form.countyLimitedPrice}}</el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="郑州乡级公立医院限价：" prop="townshipLimitedPrice">{{form.townshipLimitedPrice}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="郑州市外公立医院限价：" prop="nonZhenzhouLimitedPrice">{{form.nonZhenzhouLimitedPrice}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="郑州区级公立医院限价：" prop="districtLimitedPrice">{{form.districtLimitedPrice}}</el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="调整标志：">{{kindo.dictionary.getLabel(FLAG,form.flag)}}</el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="是否需要审批标志：">{{form.examineFlag?form.examineFlag==='1'?'是':'否':''}}</el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button icon="el-icon-close" type="primary" @click="visible = false">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import config from './config/index.js'
import mixin from '@src/utils/helper/tableMixIn.js'

export default {
  name: 'medicalProLibrary',
  mixins: [mixin],
  data() {
    return {
      // 表格默认排序
      tableSort: {
        prop: 'itemCatalogueCode',
        order: 'ascending'
      },
      table: {
        url: config.api.table
      },
      // 数据字典
      dict: {
        // 收费等级
        CHARGE_LEVEL: [],
        // 收费类别
        ITEM_CHARGE_TYPE: []
      },
      // 调整标志
      FLAG: [{ label: '未调整', value: '0' }, { label: '已调整', value: '1' }],
      selection: [],
      search: {
        itemCatalogueName: '',
        itemIntension: '',
        chargeCategory: '',
        chargeLevel: '',
        designatedMedicalInstitution: ''
      },
      // 查看详情
      // 编辑、新增弹窗显示
      visible: false,
      // 新增、编辑表单
      form: {
        id: '',
        itemCatalogueCode: '',
        itemCatalogueName: '',
        itemIntension: '',
        remark: '',
        chargeCategory: '',
        chargeLevel: '',
        unit: '',
        provincialHighestPrice: '',
        municipalHighestPrice: '',
        countyHighestPrice: '',
        price: '',
        retiredPrice: '',
        outpatientPayRatio: '',
        inpatientPayRatio: '',
        retiredPayRatio: '',
        workRelatedInjuryPayRatio: '',
        childbirthPayRatio: '',
        secondaryLevelbPayRatio: '',
        secondaryLevelbBedFeeLimit: '',
        outpatientRatio: '',
        inpatientRatio: '',
        provHighestPrice: '',
        provHospitalPriceOther: '',
        provTertiaryLevelbPrice: '',
        nonProvTertiaryLevelbPrice: '',
        zhenzhouLimitedPrice: '',
        districtLimitedPrice: '',
        countyLimitedPrice: '',
        townshipLimitedPrice: '',
        nonZhenzhouLimitedPrice: '',
        spec: '',
        startTime: '',
        endTime: '',
        reportNumner: '',
        designatedMedicalInstitution: '',
        agentName: '',
        handleString: '',
        socialInsuranceAgencyCode: '',
        flag: '',
        examineFlag: ''
      }
    }
  },

  created() {
    // 数据字典获取
    this.getDict(this.dict)
  },

  mounted() {
    this.$nextTick(() => {
      this.$refs.table.reloadData()
    })
  },

  methods: {
    // 查看详情
    viewDetails(row) {
      kindo.util
        .promise(() => {
          this.visible = true
        })
        .then(() => {
          this.$refs.form.resetFields()
        })
        .then(() => {
          this.$http.get(config.api.detailTable, { params: { id: row.id } }).then(res => {
            this.form = Object.assign({}, row, res.data.data)
          })
        })
    }
  }
}
</script>