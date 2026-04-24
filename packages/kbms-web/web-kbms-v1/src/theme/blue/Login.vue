<template>
  <div class="container">
    <div class="main">
      <div class="left">
        <div class="sys-logo">
          <!-- <img src="./assets/image/logo.png"> -->
        </div>
        <div class="sys-name">
          <span class="title1">{{ kindo.config.SYSTEM_TITLE1 }}</span><br>
          <span class="title2">{{ kindo.config.SYSTEM_TITLE2 }}</span>
        </div>
      </div>
      <div class="right">
        <div class="login-form">
          <el-form :model="form" ref="form" :rules="rules" @submit.native.prevent @keyup.enter.native="signIn">
            <el-form-item class="sign-input" prop="userName" style="margin-bottom:30px;">
              <el-input v-model.trim="form.userName" placeholder="用户名" prefix-icon="fa fa-user" style="height:28px"></el-input>
            </el-form-item>
            <el-form-item class="sign-input" prop="password" style="margin-bottom:20px;">
              <el-input v-model.trim="form.password" type="password" placeholder="密码" prefix-icon="fa fa-key" style="height:28px"></el-input>
            </el-form-item>
            <el-form-item style="text-align:center;width:214px;height:28px;">
              <el-button type="primary" @click="signIn" class="signIn-btn">登 录</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>
    <router-view></router-view>
    <div class="footer">
    </div>
  </div>
</template>

<script>
import { Base64 } from 'js-base64'

export default {
  data() {
    return {
      api: {
        signIn: kindo.api.upms + 'user/login/signIn'
      },

      form: {
        userName: '',
        password: ''
      },

      rules: {
        userName: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
      }
    }
  },

  beforeCreate() {
    // 跳转登录时, 如果尚未获取到配置信息. 则返回首页
    if (!kindo.api) {
      this.$router.push('/')
    }
  },

  methods: {
    signIn() {
      this.$refs.form.validate(valid => {
        if (valid) {
          const param = {
            loginNo: this.form.userName,
            pwd: kindo.util.md5(this.form.password)
          }

          this.$http.post(this.api.signIn, param).then(res => {
            // 保存登录信息到 session
            const userToken = res.data
            const info = JSON.parse(Base64.decode(res.data.split('.')[1]))
            const userInfo = {}
            userInfo.emplName = JSON.parse(info.sub).emplName
            userInfo.userId = JSON.parse(info.sub).userId
            userInfo.orgaId = JSON.parse(info.sub).orgaId
            userInfo.exp = info.exp
            userInfo.isRefreshed = false
            kindo.cache.set(kindo.constant.USER_TOKEN, userToken, 'session')
            kindo.cache.set(kindo.constant.USER_INFO, userInfo, 'session')

            // 跳转首页
            this.$router.push('/')
          })
        }
      })
    },

    reset() {
      this.$refs.form.resetFields()
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  position: absolute;
  background: #f0f2f5;
  width: 100%;
  height: 100%;
  /* background-image: url(../../../assets/image/bg.svg); */
  background-image: url(./image/bg.png);
  background-repeat: no-repeat;
  background-position: center;
  background-size: 100% 100%;
  background-origin: content-box;

  .main {
    position: absolute;
    width: 802px;
    height: 458px;
    top: 94px;
    left: 50%;
    margin: 0 0 0 -401px;
    z-index: 1;
  }

  .main .left {
    /* background: url(../../../assets/image/login-bg.png); */
    width: 802px;
    text-align: center;
    position: relative;
  }

  .sys-logo {
    position: absolute;
    top: -12px;
    left: -172px;
  }

  .sys-logo img {
    height: 60px;
  }

  .sys-en-name {
    vertical-align: text-bottom;
    margin: 0 24px;
    font-size: 32px;
    color: #2cadff;
    text-shadow: 0 0 1px #666;
    font-weight: 100;
  }

  .letter {
    display: inline-block;
    position: relative;
    color: #00b4f1;
    transform-style: preserve-3d;
    perspective: 400;
    z-index: 1;
  }
  .letter:before,
  .letter:after {
    position: absolute;
    content: attr(data-letter);
    transform-origin: top left;
    top: 0;
    left: 0;
  }
  .letter,
  .letter:before,
  .letter:after {
    transition: all 0.3s ease-in-out;
  }
  .letter:before {
    text-shadow: -1px 0px 1px rgba(255, 255, 255, 0.8),
      1px 0px 1px rgba(0, 0, 0, 0.8);
    z-index: 3;
    transform: rotateX(0deg) rotateY(-15deg) rotateZ(0deg);
  }
  .letter:after {
    color: rgba(0, 0, 0, 0.11);
    z-index: 2;
    transform: scale(1.08, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)
      skew(0deg, 1deg);
  }
  .letter:hover:before {
    color: #fafafa;
    transform: rotateX(0deg) rotateY(-40deg) rotateZ(0deg);
  }
  .letter:hover:after {
    transform: scale(1.08, 1) rotateX(0deg) rotateY(40deg) rotateZ(0deg)
      skew(0deg, 22deg);
  }

  .sys-name {
    font-family: "SimHei";
    letter-spacing: 6px;
    line-height: 76px;
    .title1 {
      font-size: 48px;
      color: #5e5e61;
      text-shadow: 0 0 1px #666;
    }
    .title2 {
      font-size: 28px;
      color: #34a1ff;
      text-shadow: 0 0 1px #34a1ff;
    }
  }

  .login-title {
    font-size: 14px;
    margin-bottom: 20px;
    text-align: center;
    position: relative;
    margin-top: 30px;
    color: #fff;
  }

  .login-form {
    width: 214px;
    position: relative;
    margin: 30px auto 0;
    /deep/ .el-input {
      height: 44px !important;
      font-size: 17px;
    }
    /deep/ .el-input--mini .el-input__inner {
      height: 44px;
      line-height: 44px;
      width: 350px;
      border-radius: 0 !important;
    }
  }

  .login-form .sign-input {
    margin-bottom: 18px;
  }
  .signIn-btn {
    width: 350px;
    height: 38px;
    font-size: 16px;
    color: #fbfbfb;
    border-radius: 8px;
  }

  // @media screen and (max-width: 1366px) {
  .main .right {
    width: 550px;
    height: 200px;
    position: absolute;
    left: 50%;
    margin: 64px 0 0 -339px;
  }
  // }

  // @media screen and (min-width: 1366px) {
  //   .main .right {
  //     width: 550px;
  //     height: 200px;
  //     position: absolute;
  //     left: 50%;
  //     margin: 125px 0 0 -339px;
  //   }
  // }

  .footer {
    position: absolute;
    width: 100%;
    bottom: 20px;
    text-align: center;
    line-height: 24px;
  }
  .footer p {
    color: #ffffff;
  }
}
</style>
