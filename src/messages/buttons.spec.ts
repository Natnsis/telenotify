import { BadRequestException } from '@nestjs/common';
import { validateButtons } from './buttons';

describe('validateButtons', () => {
  it('accepts valid rows and strips extra fields', () => {
    expect(validateButtons([[{ text: 'Pay', url: 'https://pay.test', extra: 1 }]])).toEqual([[{ text: 'Pay', url: 'https://pay.test' }]]);
  });

  it.each([
    [[{ text: 'x', url: 'https://a' }]], // row is not an array
    [[[]]],
    [[[{ text: '', url: 'https://a' }]]],
    [[[{ text: 'x', url: 'javascript:alert(1)' }]]],
  ])('rejects %j', (input) => {
    expect(() => validateButtons(input)).toThrow(BadRequestException);
  });
});
