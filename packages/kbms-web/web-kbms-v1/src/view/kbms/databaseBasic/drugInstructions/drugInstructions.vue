<!--
 * 基础库-药品说明书 
-->
<template>
  <div>
    <kindo-box title="查询条件">
      <el-form :model="table.search" label-position="right" onsubmit="return false;" inline @keyup.enter.prevent.native="getTable('table')">
        <el-form-item label="商品名称" prop="proprietaryName">
          <el-input v-model.trim="table.search.proprietaryName" clearable></el-input>
        </el-form-item>
        <el-form-item label="药品通用名" prop="genericName">
          <el-input v-model.trim="table.search.genericName" clearable></el-input>
        </el-form-item>
        <el-form-item label="成分" prop="composition">
          <el-input v-model.trim="table.search.composition" clearable></el-input>
        </el-form-item>
        <el-form-item label="本位码" prop="standardCode">
          <el-input v-model.trim="table.search.standardCode" clearable></el-input>
        </el-form-item>
        <!-- <el-form-item label="用药分类" prop="drugClass">
          <el-select clearable v-model="table.search.drugClass" placeholder="请选择">
            <el-option v-for="item in source.MEDICINE_TYPE" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item> -->
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getTable('table')">查询</el-button>
      </div>
    </kindo-box>

    <kindo-box title="药品说明书">
      <kindo-table ref="table" :url="table.url" :default-sort="tableSort" :queryParam="table.search" @selection-change="(selection) => tableChange('table', selection)">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <!-- <el-table-column label="用药分类" prop="drugClass" :formatter="(r,c,v) => kindo.dictionary.getLabel(source.MEDICINE_TYPE, v)" width="120" fixed="left" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column> -->
        <el-table-column label="说明书编码" prop="packageInsertCode" width="120" header-align="center" sortable="custom" fixed="left" show-overflow-tooltip></el-table-column>
        <el-table-column label="药品通用名" prop="genericName" width="150" header-align="center" sortable="custom" fixed="left" show-overflow-tooltip></el-table-column>
        <el-table-column label="剂型" prop="dosageForm" width="120" header-align="center" sortable="custom" fixed="left" show-overflow-tooltip></el-table-column>
        <el-table-column label="商品名称" prop="proprietaryName" width="150" header-align="center" sortable="custom" fixed="left" show-overflow-tooltip></el-table-column>
        <el-table-column label="英文名" prop="englishName" width="150" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="成份" prop="composition" width="300" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="性状" prop="description" width="200" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="适应症" prop="indications" width="200" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="规格型号" prop="spec" width="120" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="规格（成分比例）" prop="activeIngredient" width="160" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="用法用量" prop="dosageAdministration" width="120" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="不良反应" prop="adverseReactions" width="120" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="禁忌" prop="restriction" width="120" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="注意事项" prop="precautions" width="120" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="儿童用药" prop="children" width="120" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="老年人用药" prop="oldage" width="120" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="孕妇及哺乳期妇女用药" prop="pregnantLactation" width="180" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="药物相互作用" prop="drugInteractions" width="120" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="药物过量" prop="overdosage" width="120" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="药理毒理" prop="pharmacologyToxicology" width="120" header-align="center" show-overflow-tooltip></el-table-column>
        <el-table-column label="药代动力学" prop="pharmacokinetics" width="120" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="贮藏" prop="storage" width="120" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="规格（包装）" prop="packingSpec" width="120" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="有效期" prop="validity" width="80" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="执行标准" prop="standards" width="210" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="批准文号" prop="approvalNumber" width="150" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="生产企业" prop="manufacturer" width="190" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="本位码" prop="standardCode" width="140" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="本位码备注" prop="standardRemark" width="130" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="药品类型" prop="type" :formatter="(r,c,v) => kindo.dictionary.getLabel(source.YPLX, v)" width="100" header-align="center" sortable="custom" show-overflow-tooltip></el-table-column>
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="复制" placement="top-start">
              <el-button type="text" icon="el-icon-document-copy" @click="copy('table', scope.row.id)"></el-button>
            </el-tooltip>
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
        <el-button icon="el-icon-plus" type="text" @click="add('table', '', 'tableForm')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('table')">删除</el-button>
      </div>
    </kindo-box>

    <el-dialog top="0" :title="table.dialog.title +'药品说明书'" :visible.sync="table.dialog.visible" width="1000px" :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="table.form" :rules="table.formRules" ref="tableForm" label-width="160px" onsubmit="return false;">
        <el-form-item label="用药分类" prop="drugClass">
          <el-radio :isDisabled="table.form.id? true:false" v-model="table.form.drugClass" v-for="(item,index) in source.MEDICINE_TYPE" :key="index" :label="item.value">{{item.label}}</el-radio>
        </el-form-item>
        <el-row>
          <el-col :span="12">
            <el-form-item label="批准文号" prop="approvalNumber">
              <el-input v-model="table.form.approvalNumber"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="药品通用名" prop="genericName">
              <el-input :isDisabled="table.form.id? true:false" v-model="table.form.genericName"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="规格（成分比例）" prop="activeIngredient">
          <el-input v-model="table.form.activeIngredient" type="textarea" autosize></el-input>
        </el-form-item>
        <el-row>
          <el-col :span="12">
            <el-form-item label="商品名称" prop="proprietaryName">
              <el-input v-model="table.form.proprietaryName"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="规格（包装）" prop="packingSpec">
              <el-input v-model="table.form.packingSpec"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="英文名" prop="englishName">
              <el-input v-model="table.form.englishName"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="规格型号" prop="spec">
              <el-input v-model="table.form.spec"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="成份" prop="composition">
          <el-input v-model="table.form.composition" type="textarea" autosize></el-input>
        </el-form-item>
        <el-form-item label="适应症" prop="indications">
          <el-input v-model="table.form.indications" type="textarea" autosize></el-input>
        </el-form-item>
        <el-form-item label="用法用量" prop="dosageAdministration">
          <el-input v-model="table.form.dosageAdministration" type="textarea" autosize></el-input>
        </el-form-item>
        <el-row>
          <el-col :span="12">
            <el-form-item label="剂型" prop="dosageForm">
              <el-input v-model="table.form.dosageForm"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性状" prop="description">
              <el-input v-model="table.form.description"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="不良反应" prop="adverseReactions">
          <el-input v-model="table.form.adverseReactions" type="textarea" autosize></el-input>
        </el-form-item>
        <el-form-item label="禁忌" prop="restriction">
          <el-input v-model="table.form.restriction" type="textarea" autosize></el-input>
        </el-form-item>
        <el-form-item label="药物相互作用" prop="drugInteractions">
          <el-input v-model="table.form.drugInteractions" type="textarea" autosize></el-input>
        </el-form-item>
        <el-form-item label="注意事项" prop="precautions">
          <el-input v-model="table.form.precautions" type="textarea" autosize></el-input>
        </el-form-item>
        <el-form-item label="药理毒理" prop="pharmacologyToxicology">
          <el-input v-model="table.form.pharmacologyToxicology" type="textarea" autosize></el-input>
        </el-form-item>
        <el-form-item label="药代动力学" prop="pharmacokinetics">
          <el-input v-model="table.form.pharmacokinetics" type="textarea" autosize></el-input>
        </el-form-item>
        <el-form-item label="孕妇及哺乳期妇女用药" prop="pregnantLactation">
          <el-input v-model="table.form.pregnantLactation" type="textarea" autosize></el-input>
        </el-form-item>
        <el-form-item label="儿童用药" prop="children">
          <el-input v-model="table.form.children" type="textarea" autosize></el-input>
        </el-form-item>
        <el-form-item label="老年人用药" prop="oldage">
          <el-input v-model="table.form.oldage" type="textarea" autosize></el-input>
        </el-form-item>
        <el-row>
          <el-col :span="12">
            <el-form-item label="有效期" prop="validity">
              <el-input v-model="table.form.validity"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="执行标准" prop="standards">
              <el-input v-model="table.form.standards"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="生产企业" prop="manufacturer">
              <el-input v-model="table.form.manufacturer"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="贮藏" prop="storage">
              <el-input v-model="table.form.storage"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="本位码" prop="standardCode">
              <el-input v-model="table.form.standardCode"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="药品类型" prop="type">
              <el-select clearable v-model="table.form.type" placeholder="请选择">
                <el-option v-for="item in source.YPLX" :key="item.value" :label="item.label" :value="item.value">
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-form-item label="本位码备注" prop="standardRemark">
            <el-input v-model="table.form.standardRemark" type="textarea" autosize></el-input>
          </el-form-item>
        </el-row>
      </el-form>

      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="save('table')">确 定</el-button>
        <el-button @click="table.dialog.visible = false">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import config from './config'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  name: 'drugInstructions',
  mixins: [tableOpra],
  data() {
    return {
      table: {
        url: config.api.get,
        // 已选中表格数据
        selection: [],
        search: {
          proprietaryName: '',
          genericName: '',
          composition: '',
          drugClass: '',
          standardCode: ''
        },

        dialog: {
          // 编辑、新增弹窗显示
          visible: false,
          title: '新增'
        },

        // 新增、编辑表单
        form: {
          id: '',
          genericName: '',
          dosageForm: '',
          proprietaryName: '',
          composition: '',
          indications: '',
          dosageAdministration: '',
          activeIngredient: '',
          adverseReactions: '',
          restriction: '',
          precautions: '',
          pregnantLactation: '',
          children: '',
          oldage: '',
          drugInteractions: '',
          pharmacologyToxicology: '',
          pharmacokinetics: '',
          description: '',
          storage: '',
          packingSpec: '',
          validity: '',
          standards: '',
          approvalNumber: '',
          manufacturer: '',
          drugClass: '',
          standardCode: '',
          standardRemark: '',
          type: 'GC',
          englishName: '',
          spec: ''
        },

        formRules: {
          drugClass: [{ required: true, message: '请选择用药分类', trigger: 'blur' }],
          approvalNumber: [{ min: 0, max: 85, message: '长度不能超过85' }],
          genericName: [
            { required: true, message: '请输入药品通用名', trigger: 'blur' },
            { min: 0, max: 85, message: '长度不能超过85' }
          ],
          dosageForm: [{ min: 0, max: 85, message: '长度不能超过85' }],
          proprietaryName: [{ min: 0, max: 85, message: '长度不能超过85' }],
          composition: [{ min: 0, max: 200, message: '长度不能超过200' }],
          children: [{ min: 0, max: 300, message: '长度不能超过300' }],
          storage: [{ min: 0, max: 85, message: '长度不能超过85' }],
          packingSpec: [{ min: 0, max: 85, message: '长度不能超过85' }],
          manufacturer: [{ min: 0, max: 85, message: '长度不能超过85' }],
          standardCode: [{ min: 0, max: 85, message: '长度不能超过85' }],
          standardRemark: [{ min: 0, max: 85, message: '长度不能超过85' }],
          englishName: [{ min: 0, max: 85, message: '长度不能超过85' }],
          spec: [{ min: 0, max: 85, message: '长度不能超过85' }]
        }
      },

      source: {
        YPLX: [
          { label: '国产', value: 'GC' },
          { label: '进口', value: 'JK' }
        ],
        MEDICINE_TYPE: [
          { label: '基础用药', value: '01' },
          { label: '辅助用药', value: '02' }
        ]
      },

      tableSort: {
        prop: 'packageInsertCode',
        order: 'ascending'
      }
    }
  },

  mounted() {
    this.$nextTick(function () {
      this.getTable('table')
    })
  }
}
</script>
