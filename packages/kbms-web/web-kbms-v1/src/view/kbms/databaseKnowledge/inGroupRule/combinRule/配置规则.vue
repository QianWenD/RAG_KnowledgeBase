<template>
  <div id="ruleTree">
    <div v-if="model.tj !== undefined" :class="'item item' + model.depth">
      <el-select v-model="model.tj" style="width:200px;" :disabled="!ruleEdit">
        <el-option label="满足所有条件" value="&&"></el-option>
        <el-option label="满足任一条件" value="||"></el-option>
        <el-option label="满足所有条件(非)" value="!&&"></el-option>
        <el-option label="满足任一条件(非)" value="!||"></el-option>
      </el-select>
      <el-button @click="addGroup" v-if="ruleEdit">{}+</el-button>
      <el-button v-if="model.depth!==1 && ruleEdit" @click="deleteGroup">-</el-button>
    </div>
    <div v-if="model.item !== undefined" :class="'item item' + model.depth">
      <el-select v-model="model.itemValue" :disabled="!ruleEdit" filterable style="width:200px;" multiple>
        <li class="title">
          <span>代码值</span>
          <span>代码标题</span>
        </li>
        <li class="tip">
          <span>
            &lt;请选择&gt;
          </span>
        </li>
        <el-option v-for="item in source.ZL" :key="item.value" :label="item.label" :value="item.value">
          <span>{{ item.code }}</span>
          <span>{{ item.label }}</span>
        </el-option>
      </el-select>
    </div>

    <rule-tree class="tree" v-for="(childData,index) in model.children" :key="index" :model="childData" :parent="model" :ruleEdit="ruleEdit" :source="source" :index="index"></rule-tree>

  </div>
</template>

<script>
export default {
  name: 'ruleTree',
  template: 'ruleTree',
  props: {
    ruleEdit: { type: Boolean, default: false },
    model: Object,
    source: Object,
    parent: Object,
    index: { type: Number, default: 0 }
  },

  created() { },

  methods: {
    addGroup() {
      if (this.model.depth === 5 || this.model.depth > 5) {
        kindo.util.alert('最多建立五层嵌套规则', '提示', 'warning')
      } else {
        if (this.model.children) {
          this.model.children.push({ tj: '||', item: [], itemValue: [], depth: this.model.depth + 1, children: [] })
        } else {
          this.model.children = []
          this.model.children.push({ tj: '||', item: [], itemValue: [], depth: this.model.depth + 1, children: [] })
        }
      }
    },
    deleteGroup() {
      this.parent.children.splice(this.index, 1)
    }
  }
}
</script>

<style lang="scss" scoped>
#ruleTree {
  .item {
    margin-top: 6px;
    margin-bottom: 6px;
  }
  .item1 {
    margin-left: 50px * 1;
  }
  .item2 {
    margin-left: 50px * 2;
  }
  .item3 {
    margin-left: 50px * 3;
  }
  .item4 {
    margin-left: 50px * 4;
  }
  .item5 {
    margin-left: 50px * 5;
  }
}
</style>