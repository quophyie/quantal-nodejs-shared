/**
 * Bookshelf ORM tools
 *
 */

module.exports = Object.freeze({
  /**
   * Converts a bookshelf model instance to JSON
   * {Object} token - the bookshelf model instance
   */
  convertToJson: (token) => {
    if (token) return token.toJSON()
    return token
  }
})
