import { describe, it, expect } from 'vitest'
import { substituteVariables } from '../actions'

describe('substituteVariables', () => {
  it('replaces known variables', () => {
    const html = '<p>Hello {{customer_name}}, welcome to {{store_name}}!</p>'
    const result = substituteVariables(html, {
      customer_name: 'Alice',
      store_name: 'Test Store',
    })
    expect(result).toBe('<p>Hello Alice, welcome to Test Store!</p>')
  })

  it('replaces unknown variables with empty string', () => {
    const html = '<p>Code: {{discount_code}}</p>'
    const result = substituteVariables(html, {})
    expect(result).toBe('<p>Code: </p>')
  })

  it('handles multiple occurrences of the same variable', () => {
    const html = '{{name}} and {{name}}'
    const result = substituteVariables(html, { name: 'Bob' })
    expect(result).toBe('Bob and Bob')
  })

  it('leaves non-variable text unchanged', () => {
    const html = '<p>No variables here</p>'
    const result = substituteVariables(html, { foo: 'bar' })
    expect(result).toBe('<p>No variables here</p>')
  })

  it('handles empty html string', () => {
    expect(substituteVariables('', { name: 'X' })).toBe('')
  })

  it('handles empty vars object', () => {
    const html = '{{a}} {{b}}'
    expect(substituteVariables(html, {})).toBe(' ')
  })
})
