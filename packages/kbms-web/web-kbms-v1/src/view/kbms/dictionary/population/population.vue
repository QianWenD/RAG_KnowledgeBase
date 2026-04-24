/*
 * @Author: zhengtian
 * @Date: 2018-04-08
 * @Desc:人群字典
 */
<template>
  <div>
    <!-- 父表 -->
    <kindo-box title="人群字典" icon="xx">
      <el-form :model="parent.search" onsubmit="return false;" label-position="right" inline
        @keyup.enter.prevent.native="getTable('parent')">
        <el-form-item label="年龄段名称">
          <el-input v-model.trim="parent.search.name" placeholder="" clearable></el-input>
        </el-form-item>
      </el-form>
      <div slot="control">
        <el-button icon="el-icon-search" type="primary" @click="getTable('parent')">查询</el-button>
      </div>
    </kindo-box>
    <kindo-box title="人群字典信息">
      <kindo-table ref="parent" :url="parent.url" :queryParam="parent.search" :extendOption="extend"
        @selection-change="(selection) => tableChange('parent', selection)">
        <el-table-column type="selection" fixed="left" width="30"></el-table-column>
        <el-table-column label="年龄段名称" fixed="left" prop="name" min-width="100" header-align="center"></el-table-column>
        <el-table-column label="最小年龄" prop="minAge" min-width="120" header-align="center"></el-table-column>
        <el-table-column label="最大年龄" prop="maxAge" min-width="120" header-align="center"></el-table-column>
        <el-table-column label="年龄单位" prop="unit" min-width="120" header-align="center"
          :formatter="(row, column) => kindo.dictionary.getLabel(dict.PEOPLE_UNIT,row[column.property])">
        </el-table-column>
        <el-table-column label="审核状态" prop="status" width="100" align="center" columnKey='status'
          :filters="columnFilters(dict.AUDIT_STATUS)" :filter-method="filterHandler" :filter-multiple="false"
          filter-placement="bottom-end">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === '1'?'success':'info'" close-transition>
              {{kindo.dictionary.getLabel(dict.AUDIT_STATUS,scope.row.status)}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="scope">
            <el-tooltip class="item" effect="dark" :open-delay="300" content="编辑" placement="top-start">
              <el-button type="text" icon="el-icon-edit" @click="update('parent', scope.row.id)"></el-button>
            </el-tooltip>
            <el-tooltip class="item" effect="dark" :open-delay="300" content="删除" placement="top-start">
              <el-button type="text" icon="el-icon-delete" @click="remove('parent', scope.row.id)"></el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </kindo-table>
      <div slot="control">
        <el-button icon="el-icon-plus" type="text" @click="add('parent','','parentForm')">新增</el-button>
        <el-button icon="el-icon-delete" type="text" @click="remove('parent')">删除</el-button>
        <el-button icon="el-icon-view" type="text" @click="audit('parent')">审核</el-button>
      </div>
    </kindo-box>
    <!-- 父表弹框-->
    <el-dialog v-drag top="0" :visible.sync="parent.dialog.visible" :title="parent.dialog.title +'人群'"
      :modal-append-to-body="false" :close-on-click-modal="false">
      <el-form :model="parent.form" class="box" onsubmit="return false;" ref="parentForm" label-width="100px"
        :rules="parent.rules" label-position="right">
        <el-form-item label="年龄段名称" prop="name">
          <el-input v-model.trim="parent.form.name"></el-input>
        </el-form-item>
        <el-form-item label="最小年龄" prop="minAge">
          <el-input-number :controls="false" size="mini" :min="0" :max="100" v-model.trim.number="parent.form.minAge">
          </el-input-number>
        </el-form-item>
        <el-form-item label="最大年龄" prop="maxAge">
          <el-input-number :controls="false" size="mini" :min="0" :max="10000" v-model.trim.number="parent.form.maxAge">
          </el-input-number>
        </el-form-item>
        <el-form-item label="年龄单位" prop="unit">
          <el-select v-model.trim="parent.form.unit" filterable clearable>
            <el-option v-for="item in dict.PEOPLE_UNIT" :key="item.value" :label="item.label" :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" icon="fa fa-floppy-o" @click="save('parent')">保 存</el-button>
        <el-button @click="parent.dialog.visible = false" icon="el-icon-close" type="primary">取 消</el-button>
      </div>
    </el-dialog>
    <!-- 父表弹框-->
  </div>
</template>

<script>
import config from './config/index.js'
import tableOpra from '@src/utils/helper/tableOpra.js'
export default {
  name: 'population',
  mixins: [tableOpra],
  data() {
    return {
      // 主表默认选第一行数据
      extend: { selectedFirst: true },
      loading: false,
      disabled: true,
      dict: {
        // 审核状态
        AUDIT_STATUS: [],
        // 年龄单位
        PEOPLE_UNIT: []
      },
      parent: {
        url: config.api.parent,
        selection: [],
        search: {
          name: '',
          status: ''
        },
        dialog: {
          visible: false,
          title: '新增'
        },
        form: {
          id: '',
          name: '',
          minAge: '',
          maxAge: '',
          unit: ''
        },
        rules: {
          name: [{ required: true, message: '请输入年龄段', trigger: 'blur' }],
          minAge: [
            { required: true, message: '请输入最小年龄', trigger: 'blur' },
            {
              validator: (rule, value, callback) => {
                if (value !== '') {
                  if (!kindo.validate.integer(value)) {
                    callback(new Error('必须为正整数'))
                  } else if (value > this.parent.form.maxAge) {
                    callback(new Error('不能大于最大年龄'))
                  } else {
                    callback()
                  }
                }
              }
            }
          ],
          maxAge: [
            { required: true, message: '请输入最大年龄', trigger: 'blur' },
            {
              validator: (rule, value, callback) => {
                if (value !== '') {
                  if (!kindo.validate.integer(value)) {
                    callback(new Error('必须为正整数'))
                  } else if (value < this.parent.form.minAge) {
                    callback(new Error('不能小于最小年龄'))
                  } else {
                    callback()
                  }
                }
              }
            }
          ],
          unit: [{ required: true, message: '请选择单位', trigger: 'blur' }]
        }
      }
    }
  },
  methods: {},

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