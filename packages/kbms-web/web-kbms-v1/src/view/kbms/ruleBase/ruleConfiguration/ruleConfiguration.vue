/* @Author:litianye
 * @Date:2018/6/5
 * @Desc:规则配置
 */
<template>
  <div>
    <kindo-box title="查询条件">
      <el-form v-model.trim="search" onsubmit="return false;" label-position="right" inline
        @keyup.enter.native="get('table')">
        <el-form-item label="规则名称">
          <el-input v-model.trim="search.ruleName" placeholder="" clearable></el-input>
        </el-form-item>
        <el-form-item label="应用场景">
          <el-select v-model.trim="search.scene" placeholder="请选择" clearable>
            <el-option v-for="item in dict.RULE_SCENE" :label="item.label" :value="item.value" :key="item.value">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="使用险种">
          <el-select v-model.trim="search.insurance" placeholder="请选择" clearable>
            <el-option v-for="item in dict.RULE_INSURANCE" :label="item.label" :value="item.value" :key="item.value">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="运行状态">
          <el-select v-model.trim="search.ruleStatus" placeholder="请选择" clearable>
            <el-option label="开启" value="1"></el-option>
            <el-option label="关闭" value="0"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="get('table')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="配置规则">
      <kindo-table ref="table" :url="config.api.table" :queryParam="search" :default-sort="tableSort"
        @selection-change="(selection) => selectionChange(selection,'selection')">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="组编码" prop="groupCode" width="100" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="权重" prop="weight" width="70" header-align="center" align="right" sortable
          show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="规则ID" prop="ruleCode" width="110" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="规则名称" prop="ruleName" min-width="120" header-align="center" show-overflow-tooltip>
        </el-table-column>
        <el-table-column label="应用场景" prop="scene" width="110" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope" v-if="scope.row.scene">
            <span v-for="(item,index) in scope.row.scene.split(',')"
              :key="item">{{ (index ? '，':'') + kindo.dictionary.getLabel(dict.RULE_SCENE,item)}}</span>
          </template>
        </el-table-column>
        <el-table-column label="规则依据来源" prop="ruleType" width="120" header-align="center" align="center"
          show-overflow-tooltip>
          <template slot-scope="scope">
            <el-button type="text" @click="showEnclosure(scope.row)">附件</el-button>
          </template>
        </el-table-column>
        <el-table-column label="规则风控等级" prop="riskLevel" width="120" align="center" header-align="center"
          show-overflow-tooltip
          :formatter="(row,column)=>kindo.dictionary.getLabel(sourse.RULE_WIND_GRADE,row[column.property])">
        </el-table-column>
        <el-table-column label="使用险种" prop="insurance" width="120" header-align="center" show-overflow-tooltip>
          <template slot-scope="scope" v-if="scope.row.insurance">
            <span v-for="(item,index) in scope.row.insurance.split(',')"
              :key="item">{{(index ? '，':'') + kindo.dictionary.getLabel(dict.RULE_INSURANCE,item)}}</span>
          </template>
        </el-table-column>
        <el-table-column label="运行状态" prop="ruleStatus" :formatter="(r,c,v) => v==='1'?'开启':v==='0'?'关闭':''" width="90"
          align="center">
        </el-table-column>
        <el-table-column label="规则逻辑" width="120" align="center">
          <template slot-scope="scope">
            <el-button type="text" @click="showRule(scope.row)">查看</el-button>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="edit(scope.row,'form','','visible','toArray')">
              </el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="deleteOne(scope.row.id,'table')"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="insert('visible','form')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="batch('selection','table','delete')">删除</el-button>
      </div>
    </kindo-box>
    <!-- 主表弹框 -->
    <el-dialog v-drag top="0" :visible.sync="visible" :title="(form.id?'编辑':'新增')+'规则配置'" :modal-append-to-body="false"
      :close-on-click-modal="false" width="850px">
      <el-form :model="form" class="box" onsubmit="return false;" ref="form" :rules="rules" label-width="130px"
        label-position="right">
        <el-form-item label="组编码" prop="groupCode">
          <el-input v-model.trim="form.groupCode"></el-input>
        </el-form-item>
        <el-form-item label="权重" prop="weight">
          <el-input-number v-model.trim="form.weight" :min="0" :max="99999" :controls="false"></el-input-number>
        </el-form-item>
        <el-form-item label="规则名称" style="display:block;" prop="ruleName">
          <el-select v-model.trim="form.ruleName" size="mini" :disabled="!kindo.validate.isEmpty(form.id)"
            @blur="(ev)=>{blurSel(ev,form,'ruleName','commonDrugList')}" placeholder="输入选择" clearable filterable remote
            :remote-method="(query) => getDictRemote('commonDrugList', 'keyword', query)">
            <el-option v-for="item in list.commonDrugList" :key="item.value" :label="item.label" :value="item.label">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="是否直接扣款" prop="debit">
          <el-switch v-model="form.debit" active-text="开启" inactive-text="关闭" :active-value="'1'" :inactive-value="'0'"
            active-color="#13ce66" inactive-color="#C0CCDA">
          </el-switch>
        </el-form-item>
        <el-form-item label="定性" prop="qualitative">
          <el-switch v-model="form.qualitative" active-text="开启" inactive-text="关闭" :active-value="'0'"
            :inactive-value="'1'" active-color="#13ce66" inactive-color="#C0CCDA">
          </el-switch>
        </el-form-item>
        <el-form-item label="应用场景" prop="scene">
          <el-checkbox-group v-model="form.scene">
            <el-checkbox v-for="item in dict.RULE_SCENE" :label="item.value" :key="item.value">
              {{item.label}}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="规则风控等级" prop="riskLevel">
          <el-radio-group v-model="form.riskLevel">
            <el-radio v-for="item in sourse.RULE_WIND_GRADE" :label="item.value" :key="item.value">{{item.label}}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="使用险种" prop="insurance" id="use-insurance">
          <el-checkbox-group v-model="form.insurance">
            <el-checkbox v-for="item in dict.RULE_INSURANCE" :label="item.value" :key="item.value">{{item.label}}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="规则来源依据">
          <el-upload :data="uploadData" ref="upload" class="upload-demo"
            :headers="{'Authorization':'Bearer ' + kindo.cache.get(kindo.constant.USER_TOKEN)}"
            :action="config.api.uploadFile" :before-remove="beforeRemove" :on-remove="handleRemove"
            :on-preview="PictureShow" :file-list="fileList" list-type="picture" :on-success="upldadSuccess"
            :auto-upload="false">
            <el-button size="small" type="text">点击上传</el-button>
            <div slot="tip" class="el-upload__tip">(只能上传jpg/png文件，且不超过10M)</div>
          </el-upload>
        </el-form-item>
        <hr>

        <el-form-item label="规则定义" prop="ruleDefinition">
          <el-input v-model.trim="form.ruleDefinition" type="textarea" placeholder="可输入200文字"></el-input>
        </el-form-item>
        <el-form-item label="规则逻辑" prop="description">
          <el-input v-model.trim="form.description" type="textarea" placeholder="可输入200文字"></el-input>
        </el-form-item>
        <el-form-item label="阈值" prop="thresholdLabel">
          <el-row :gutter="20" style="margin:0px;">
            <el-col :span="8" style="padding-left:0px;margin:0px;">
              <div class="box">
                <div class="top">
                  <el-tooltip class="item" effect="dark" content="文本" placement="top-start">
                    <el-input type="text" v-model.trim="form.thresholdLabel" placeholder=""></el-input>
                  </el-tooltip>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="box">
                <div class="top">
                  <el-tooltip class="item" effect="dark" content="数值" placement="top-start">
                    <el-input-number v-model.trim="form.thresholdValue" placeholder="" :min="0" :controls="false"
                      size="mini"></el-input-number>
                  </el-tooltip>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="box">
                <div class="top">
                  <el-tooltip class="item" effect="dark" content="单位" placement="top-start">
                    <el-input v-model.trim="form.thresholdUnit" placeholder=""></el-input>
                  </el-tooltip>
                </div>
              </div>
            </el-col>
          </el-row>

        </el-form-item>
        <el-form-item label="运行状态" prop="ruleStatus">
          <el-switch v-model="form.ruleStatus" active-text="开启" inactive-text="关闭" :active-value="'1'"
            :inactive-value="'0'" active-color="#13ce66" inactive-color="#C0CCDA">
          </el-switch>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('form','table','visible')">保 存</el-button>
        <el-button @click="visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
      <el-dialog v-drag top="0" append-to-body :visible.sync="dialogVisible" :modal-append-to-body="false"
        :close-on-click-modal="false" width="60%" style="border:none;">
        <p align="center"><img :src="dialogImageUrl" style="width: 100%;height: 100%;object-fit:cover;" /></p>
      </el-dialog>
    </el-dialog>
    <!-- END 主表弹框 -->

    <!-- 规则逻辑弹窗 -->
    <el-dialog v-drag top="0" :visible.sync="visibleRule" title="规则逻辑" modal-append-to-body
      :close-on-click-modal="false">
      <el-form :model="form" class="box" onsubmit="return false;" ref="form" label-width="130px" label-position="right">
        <el-form-item label="规则ID：">
          {{form.ruleCode}}
        </el-form-item>
        <el-form-item label="规则名称：">
          {{form.ruleName}}
        </el-form-item>
        <el-form-item label="规则逻辑：">
          <el-input v-model.trim="form.description" type="textarea" disabled="disabled"></el-input>
        </el-form-item>
        <el-form-item label="阈值文本：">
          {{form.thresholdValue}}{{form.thresholdUnit}}
        </el-form-item>
        <el-form-item label="知识点审核完毕：">
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="visibleRule = false" icon="el-icon-close" type="primary">关 闭</el-button>
      </div>
    </el-dialog>
    <!-- END规则逻辑弹窗 -->

    <!-- 规则来源依据弹窗 -->
    <el-dialog v-drag top="0" :visible.sync="visibleEnclosure" title="附件依据来源" :modal-append-to-body="false"
      :close-on-click-modal="false">
      <el-form :model="form" class="box" onsubmit="return false;" ref="form" label-width="0px" label-position="right">
        <el-form-item label=" ">
          <el-upload class="upload-demo" :file-list="fileList" list-type="picture" :action="config.api.uploadFile"
            :before-remove="beforeRemove" :on-remove="handleRemove" :on-preview="PictureShow">
          </el-upload>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="visibleEnclosure = false" icon="el-icon-close" type="primary">关 闭</el-button>
      </div>
      <el-dialog v-drag top="0" append-to-body :visible.sync="dialogVisible" :modal-append-to-body="false"
        :close-on-click-modal="false" width="60%" style="border:none;">
        <p align="center"><img :src="dialogImageUrl" style="width: 100%;height: 100%;object-fit:cover;" /></p>
      </el-dialog>
    </el-dialog>
    <!-- END规则来源依据弹窗 -->
  </div>
</template>

<script>
import config from './config/index.js'
import tableMixIn from '@src/utils/helper/tableMixIn.js'
export default {
  name: 'ruleConfiguration',
  mixins: [tableMixIn],
  data() {
    return {
      config,
      uploadData: {
        relId: ''
      },
      visible: false,
      visibleRule: false,
      visibleEnclosure: false,
      // 附件图片路径
      dialogImageUrl: '',
      // 附件图片弹窗
      dialogVisible: false,
      selection: [],
      // 表格默认排序
      tableSort: {
        prop: 'weight',
        order: 'ascending'
      },
      search: {
        scene: '',
        insurance: '',
        ruleName: '',
        ruleStatus: ''
      },
      form: {
        id: '',
        groupCode: '',
        weight: '',
        ruleName: '',
        relId: '',
        debit: '',
        qualitative: '',
        scene: [],
        riskLevel: '',
        insurance: [],
        ruleDefinition: '',
        description: '',
        thresholdLabel: '',
        thresholdValue: '',
        thresholdUnit: '',
        ruleStatus: '0'
      },
      rules: {
        groupCode: [
          { required: true, message: '请输入组编码', trigger: 'blur' },
          {
            validator: (rule, value, callback) => {
              if (value.length !== 4) {
                callback(new Error('请输入4位组编码'))
              } else {
                callback()
              }
            },
            trigger: 'blur'
          }
        ],
        weight: [
          { required: true, message: '请输入权重值', trigger: 'blur' },
          {
            validator: (rule, value, callback) => {
              if (!kindo.validate.pInterger(value)) {
                callback(new Error('必须为整数'))
              } else {
                callback()
              }
            },
            tirgger: 'blur'
          }
        ]
      },
      sourse: {
        // 规则风控的等级
        RULE_WIND_GRADE: [{ label: '低', value: '1' }, { label: '中', value: '2' }, { label: '高', value: '3' }],
        // 是否直接扣款
        DEBIT: [{ label: '否', value: '0' }, { label: '是', value: '1' }],
        // 定性
        QUALITATIVE: [{ label: '可申诉', value: '0' }, { label: '不可申诉', value: '1' }]
      },
      list: {
        // 远程模糊搜素
        commonDrugList: []
      },
      dict: {
        // 应用场景
        RULE_SCENE: [],
        // 使用险种
        RULE_INSURANCE: []
      },
      // 上传的数组
      fileList: []
    }
  },
  created() {
    this._form = Object.assign({}, this.form)
    // 获取数据字典
    this.getDict(this.dict)
  },
  mounted() {
    this.$nextTick(() => {
      this.get('table')
    })
  },
  watch: {
    'form.ruleName': function (value) {
      if (value) {
        this.form.relId = kindo.dictionary.getValue(this.list.commonDrugList, value)
      }
    }
  },
  methods: {
    // 字符串转数组
    toArray(row) {
      this.form.scene = row.scene ? row.scene.split(',') : []
      this.form.insurance = row.scene ? row.insurance.split(',') : []
      // 点击编辑的时候带入已上传的文件
      if (row.kbmsConfigRuleFileList) {
        this.fileList =
          row.kbmsConfigRuleFileList.map(item => {
            return { name: item.fileName, url: kindo.api.uploadPctrue + item.filePath, id: item.id }
          }) || []
      } else {
        this.fileList = []
      }
    },
    // 上传文件成功后触发
    upldadSuccess(response, file, fileList) {
      if (response.code !== 200) {
        kindo.util.alert(response.message, '提示', 'warning')
      }
    },
    // 点击图片预览
    PictureShow(file) {
      this.dialogImageUrl = file.url
      this.dialogVisible = true
    },
    // 附件删除之前
    beforeRemove(file, fileList) {
      return this.$confirm(`请确认删除 ${file.name}`)
    },
    // 删除文件
    handleRemove(file, fileList) {
      this.$http.delete(config.api.deleteFile, { data: { id: file.id, filePath: file.url } }).then(res => {
        kindo.util.alert(res.message, '提示', 'success')
      })
    },

    // 规则名称远程搜素
    getDictRemote(dict, searchName, searchVal) {
      let param = { rows: 200, [searchName]: searchVal }
      this.$http.get(config.api.listForCombo, { params: param }).then(res => {
        this.list[dict] =
          res.data.map(item => {
            return { label: item.label, value: item.value }
          }) || []
      })
    },

    // 点击规则依据来源附件
    showEnclosure(row) {
      kindo.util
        .promise(() => {
          this.visibleEnclosure = true
        })
        .then(() => {
          this.toArray(row)
        })
    },
    // 点击规则逻辑查看
    showRule(row) {
      kindo.util
        .promise(() => {
          this.visibleRule = true
        })
        .then(() => {
          this.form = Object.assign({}, row)
        })
    },
    // 文件上传事件
    submitUpload() {
      this.$refs.upload.submit()
    },
    // 新增/编辑保存
    save(form, table, visible, url) {
      this.$refs[form].validate(valid => {
        if (valid) {
          let mainUrl = this.$refs[table].url
          let requestType = 'post'
          // 若有id则为编辑保存
          if (this[form].id) {
            requestType = 'put'
          }
          if (!kindo.validate.isEmpty(url)) {
            mainUrl = url
          }
          let formDate = Object.assign({}, this.form)
          // 数组转字符串
          formDate.scene = formDate.scene.toString()
          formDate.insurance = formDate.insurance.toString()
          this.$http[requestType](mainUrl, formDate).then(res => {
            kindo.util
              .promise(() => {
                this.uploadData.relId = res.data.id
              })
              .then(() => {
                if (this.$refs.upload.uploadFiles[0] && this.$refs.upload.uploadFiles[0].status !== 'success') {
                  let data = this.$refs.upload.uploadFiles[0].raw
                  let file = data.type
                  // 返回文件类型
                  const isJPG = file === 'image/jpeg' || file === 'image/jpg' || file === 'image/png'
                  // const isWord = file === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file === 'application/msword'
                  // const isExcel = file === 'application/vnd.ms-excel' || file === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                  // const isPDF = file === 'application/pdf'

                  // 验证上传的格式
                  if (data.size >= 10485760) {
                    kindo.util.alert('文件大小超过10M', '提示', 'warning')
                  } else if (!isJPG) {
                    kindo.util.alert('上传文件类型不符合要求', '提示', 'warning')
                  } else {
                    this.submitUpload()
                    kindo.util.alert(res.message, '提示', 'success')
                    this[visible] = false
                    this.get(table)
                  }
                } else {
                  kindo.util.alert(res.message, '提示', 'success')
                  this[visible] = false
                  this.get(table)
                }
              })
          })
        }
      })
    }
  }
}
</script>

<style lang="scss" scope>
#ruleType {
  .el-form-item__content {
    .el-form-item__label {
      text-align: left;
    }
  }
}
#use-insurance {
  .el-checkbox-group {
    .el-checkbox:nth-child(4) {
      margin-left: 0px;
    }
  }
}
</style>