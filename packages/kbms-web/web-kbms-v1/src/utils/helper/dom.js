/*
 * updated by pengzhen on 2018/04/19
 * peng_zhen@outlook.com
 * -------------------------------------------------
 * document 工具类
 */

/**
 * 获取元素的绝对位置 - { top , left }
 *
 * @export
 * @param {any} element
 * @returns
 */
export function getElementOffset(element) {
  return {
    top: getElementLeft(element),
    left: getElementLeft(element)
  }
}

/**
 * 获取元素的绝对位置 - top
 *
 * @export
 * @param {any} element
 * @returns
 */
export function getElementTop(element) {
  var actualTop = element.offsetTop
  var current = element.offsetParent

  while (current !== null) {
    actualTop += current.offsetTop
    current = current.offsetParent
  }

  return actualTop
}

/**
 * 获取元素的绝对位置 - left
 *
 * @export
 * @param {any} element
 * @returns
 */
export function getElementLeft(element) {
  var actualLeft = element.offsetLeft
  var current = element.offsetParent
  while (current !== null) {
    actualLeft += current.offsetLeft + current.clientLeft
    current = current.offsetParent
  }
  return actualLeft
}

export function triggerResize() {
  if (Event.prototype.initEvent) {
    const evt = window.document.createEvent('UIEvents')
    evt.initUIEvent('resize', true, false, window, 0)
    window.dispatchEvent(evt)
  } else {
    window.dispatchEvent(new Event('resize'))
  }
}
