import addStylesClient from '../lib/addStylesClient'
import addStylesServer from '../lib/addStylesServer'

const mockedList = [
  [1, 'h1 { color: red; }', ''],
  [1, 'p { color: green; }', ''],
  [2, 'span { color: blue; }', ''],
  [2, 'span { color: blue; }', 'print'],
]

test('addStylesClient (dev)', () => {
  const update = addStylesClient('foo', mockedList, false)
  assertStylesMatch(mockedList)
  const mockedList2 = mockedList.slice(1, 3)
  update(mockedList2)
  assertStylesMatch(mockedList2)
  update()
  expect(document.querySelectorAll('style').length).toBe(0)
})

test('addStylesClient (prod)', () => {
  const update = addStylesClient('foo', mockedList, true)
  assertStylesMatch(mockedList)
  const mockedList2 = mockedList.slice(2)
  update(mockedList2)
  assertStylesMatch(mockedList2)
  update()
  expect(document.querySelectorAll('style').length).toBe(0)
})

test('addStylesClient (dev + ssr)', () => {
  mockSSRTags(mockedList, 'foo')
  const update = addStylesClient('foo', mockedList, false)
  assertStylesMatch(mockedList)
  update()
  expect(document.querySelectorAll('style').length).toBe(0)
})

test('addStylesClient (prod + ssr)', () => {
  mockProdSSRTags(mockedList, 'foo')
  addStylesClient('foo', mockedList, true)
  expect(document.querySelectorAll('style').length).toBe(1)
})

test('addStylesServer (dev)', () => {
  const context = (global.__REACT_SSR_CONTEXT__ = {})
  addStylesServer('foo', mockedList, false)
  expect(context.styles).toBe(
    `<style data-react-ssr-id="foo:0">h1 { color: red; }</style>` +
      `<style data-react-ssr-id="foo:1">p { color: green; }</style>` +
      `<style data-react-ssr-id="foo:2">span { color: blue; }</style>` +
      `<style data-react-ssr-id="foo:3" media="print">span { color: blue; }</style>`,
  )
})

test('addStylesServer (prod)', () => {
  const context = (global.__REACT_SSR_CONTEXT__ = {})
  addStylesServer('foo', mockedList, true)
  expect(context.styles).toBe(
    `<style data-react-ssr-id="foo:0 foo:1 foo:2">` +
      `h1 { color: red; }\np { color: green; }\nspan { color: blue; }` +
      `</style>` +
      `<style data-react-ssr-id="foo:3" media="print">span { color: blue; }</style>`,
  )
})

// --- helpers ---

function assertStylesMatch(list) {
  const styles = document.querySelectorAll('style')
  expect(styles.length).toBe(list.length)
  Array.prototype.forEach.call(styles, (style, i) => {
    expect(style.textContent.includes(list[i][1])).toBe(true)
  })
}

function mockSSRTags(list, parentId) {
  for (const [i, item] of list.entries()) {
    const style = document.createElement('style')
    style.dataset.reactSsrId = `${parentId}:${i}`
    style.textContent = item[1]
    if (item[2]) {
      style.setAttribute('media', item[2])
    }
    document.head.append(style)
  }
}

function mockProdSSRTags(list, parentId) {
  const style = document.createElement('style')
  style.dataset.reactSsrId = list.map((_, i) => `${parentId}:${i}`).join(' ')
  style.textContent = list.map(item => item[1]).join('\n')
  document.head.append(style)
}
