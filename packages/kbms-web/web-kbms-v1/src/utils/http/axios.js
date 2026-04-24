import Vue from 'vue'
import Axios from 'axios'
import qs from 'qs'

// axios 默认配置
Axios.defaults.timeout = kindo.config.REQUEST_TIME_OUT

// http request 拦截器
Axios.interceptors.request.use(
  function (request) {
    kindo.globalBus.$emit('loading', true, request)

    request.headers['Content-Type'] = request.headers['Content-Type'] || 'application/json;charset=UTF-8'
    request.url = kindo.util.setUri(request.url)
    request.url = request.url.restfulFormat(request.params)
    request.paramsSerializer = function (params) {
      return qs.stringify(params, { arrayFormat: 'repeat' })
    }

    if (kindo.cache.get(kindo.constant.USER_TOKEN)) {
      request.headers.Authorization = 'Bearer ' + kindo.cache.get(kindo.constant.USER_TOKEN)
    }

    return request
  },
  function (error) {
    return Promise.reject(error)
  }
)

Axios.interceptors.response.use(
  function (response) {
    // console.log(response)
    kindo.globalBus.$emit('loading', false, response)

    if (response.data.code === 200 || response.data.code === '200' || response.data.code === 0 || response.data.code === '0') {
      return response.data
    } else {
      switch (response.data.code) {
        case 731:
          kindo.util.alert(response.data.message, response.data.code, 'warning')
          break
        case 753:
          kindo.util.alert(response.data.message, response.data.code, 'warning')
          break
        case 740:
          kindo.util.alert('不能添加重复数据', '740', 'warning')
          break
        case 792:
          kindo.util.alert('关联子表还有已审核数据，不能删除', '740', 'warning')
          break
        default:
          kindo.util.alert(response.data.message || '未知错误', response.data.code, 'warning')
          break
      }
      return Promise.reject(response.data)
    }
  },
  function (error) {
    kindo.globalBus.$emit('loading', false, error)
    if (error.message === 'Network Error') {
      kindo.util.alert('服务器超时,请重新登录', '401', 'warning')
    } else {
      kindo.util.alert(`${error.response.data.error} : ${error.response.data.path}`, error.response.data.status, 'error')
    }

    return Promise.reject(error)
  }
)

Vue.prototype.$http = Axios

export default Axios
