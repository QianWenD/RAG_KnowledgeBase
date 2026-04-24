/* @Author: lilizhou
  *菜单：知识库-合理用药-超量规则-药品说明书
 */
<template>
  <div>
    <kindo-box title="查询条件" icon="xx">
      <el-form :model="search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="get('table')">
        <el-form-item label="说明书编码">
          <el-input v-model.trim="search.packageInsertCode" clearable></el-input>
        </el-form-item>
        <el-form-item label="药品通用名称">
          <el-input v-model.trim="search.genericName" clearable></el-input>
        </el-form-item>
        <el-form-item label="剂型">
          <el-input v-model.trim="search.dosageForm" clearable></el-input>
        </el-form-item>
        <el-form-item label="成份">
          <el-input v-model.trim="search.composition" clearable></el-input>
        </el-form-item>
        <el-form-item label="规格型号">
          <el-input v-model.trim="search.spec" clearable></el-input>
        </el-form-item>
        <el-form-item label="生产厂家">
          <el-input v-model.trim="search.manufacturer" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="药品说明书信息">
      <kindo-table ref="table" :url="url" :extendOption="extend" :pageSize="10" :queryParam="search" @current-change="tableClick">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="说明书编码" prop="packageInsertCode" min-width="120" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="药品通用名称" prop="genericName" min-width="140" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="剂型" prop="dosageForm" width="160" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="包装型号" prop="packingSpec" width="100" align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="规格" prop="spec" width="160" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
        <el-table-column label="生产厂家" prop="manufacturer" width="160" header-align="center" sortable='custom' show-overflow-tooltip></el-table-column>
      </kindo-table>
      <el-card class="box-card">
        <div slot="header" class="clearfix" style="text-align:center;">
          <h3>药品说明书</h3>
        </div>
        <div>
          <el-row style="height:300px;overflow:auto;">
            <el-form onsubmit="return false;" label-position="right" ref="form" label-width="140px">
              <el-col :span="12">
                <el-form-item label="药品通用名称：">
                  {{drugRow.genericName}}
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="说明书编码：">
                  {{drugRow.packageInsertCode}}
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="批准文号：">
                  {{drugRow.approvalNumber}}
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="生产厂家:">
                  {{drugRow.manufacturer}}
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="商品名称：">
                  {{drugRow.proprietaryName}}
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="英文名称：">
                  {{drugRow.englishName}}
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="包装规格：">
                  {{drugRow.packingSpec}}
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="规格型号：">
                  {{drugRow.spec}}
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="规格（有效成分）：">
                  {{drugRow.activeIngredient}}
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="剂型：">
                  {{drugRow.dosageForm}}
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="成份：">
                  {{drugRow.composition}}
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="性状：">
                  {{drugRow.description}}
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="用法用量：">
                  {{drugRow.dosageAdministration}}
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="适应症：">
                  {{drugRow.indications}}
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="不良反应：">
                  {{drugRow.adverseReactions}}
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="禁忌：">
                  {{drugRow.restriction}}
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="注意事项：">
                  {{drugRow.precautions}}
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="药理毒理：">
                  {{drugRow.pharmacologyToxicology}}
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="药代动力学：">
                  {{drugRow.pharmacokinetics}}
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="药物相互作用：">
                  {{drugRow.drugInteractions}}
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="药物过量：">
                  {{drugRow.overdosage}}
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="孕妇/哺乳期用药：">
                  {{drugRow.pregnantLactation}}
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="儿童用药：">
                  {{drugRow.children}}
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="老年人用药：">
                  {{drugRow.oldage}}
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="有效期：">
                  {{drugRow.validity}}
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="执行标准：">
                  {{drugRow.standards}}
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="贮藏：">
                  {{drugRow.storage}}
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="本位码：">
                  {{drugRow.standardCode}}
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="本位码备注：">
                  {{drugRow.standardRemark}}
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="类型：">
                  {{kindo.dictionary.getLabel(dict.INSTRUCTIONS_TYPE,drugRow.type)}}
                </el-form-item>
              </el-col>
            </el-form>
          </el-row>
        </div>
      </el-card>
    </kindo-box>
  </div>
</template>

<script>
import config from './config/index.js'

export default {
  data() {
    return {
      dict: { INSTRUCTIONS_TYPE: [] },
      url: config.api.drugInstructions,
      extend: { selectedFirst: true },
      conditionParams: {
        limitDefine: '1'
      },
      search: {
        packageInsertCode: '',
        genericName: '',
        dosageForm: '',
        composition: '',
        spec: '',
        manufacturer: ''
      },
      drugRow: {}
    }
  },

  mounted() {
    this.$nextTick(() => {
      this.get('table')
    })
  },

  methods: {
    get(table) {
      this.$refs[table].reloadData()
    },
    tableClick(row) {
      if (row) {
        this.drugRow = Object.assign(row)
      } else {
        this.drugRow = {}
      }
    }
  }
}
</script>
<style scoped>
</style>