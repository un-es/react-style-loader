/* eslint-disable unicorn/filename-case */

/**
 * @typedef {{ css: string; media: string; sourceMap?: string }} StyleObjectPart
 * @typedef {{ id: number; parts: StyleObjectPart[] }} StyleObject
 */

/**
 * Translates the list format produced by css-loader into something
 * easier to manipulate.
 *
 * @param {string} parentId
 * @param {StyleObject[]} list
 * @returns {StyleObject[]} styles
 */
export default function listToStyles(parentId, list) {
  /**
   * @type {Array<StyleObject>}
   */
  const styles = []
  const newStyles = {}
  for (const [i, [id, css, media, sourceMap]] of list.entries()) {
    const part = {
      id: parentId + ':' + i,
      css,
      media,
      sourceMap,
    }
    if (newStyles[id]) {
      newStyles[id].parts.push(part)
    } else {
      styles.push((newStyles[id] = { id, parts: [part] }))
    }
  }
  return styles
}
