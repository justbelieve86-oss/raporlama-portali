import { describe, it, expect } from 'vitest';
import { getListItems } from '../apiList';

describe('getListItems helper', () => {
  it('standart sendList formatını parse eder (data.items)', () => {
    const payload = {
      success: true,
      data: {
        items: [{ id: 1, name: 'Test' }, { id: 2, name: 'Test2' }],
        count: 2,
        total: 2
      }
    };
    const result = getListItems(payload);
    expect(result).toEqual([{ id: 1, name: 'Test' }, { id: 2, name: 'Test2' }]);
  });

  it('legacy array formatını parse eder', () => {
    const payload = [{ id: 1 }, { id: 2 }];
    const result = getListItems(payload);
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('direct items formatını parse eder (items property)', () => {
    const payload = {
      items: [{ id: 1 }, { id: 2 }]
    };
    const result = getListItems(payload);
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('boş array döner payload null/undefined ise', () => {
    expect(getListItems(null)).toEqual([]);
    expect(getListItems(undefined)).toEqual([]);
  });

  it('boş array döner payload geçersiz format ise', () => {
    expect(getListItems({})).toEqual([]);
    expect(getListItems({ data: {} })).toEqual([]);
    expect(getListItems({ data: { count: 0 } })).toEqual([]);
  });

  it('boş array döner payload string ise', () => {
    expect(getListItems('invalid')).toEqual([]);
  });

  it('boş array döner payload number ise', () => {
    expect(getListItems(123)).toEqual([]);
  });

  it('boş array döner payload boolean ise', () => {
    expect(getListItems(true)).toEqual([]);
  });

  it('data.items boş array ise boş array döner', () => {
    const payload = {
      success: true,
      data: {
        items: [],
        count: 0,
        total: 0
      }
    };
    const result = getListItems(payload);
    expect(result).toEqual([]);
  });

  it('TypeScript generic type ile çalışır', () => {
    interface TestItem {
      id: number;
      name: string;
    }
    const payload = {
      data: {
        items: [{ id: 1, name: 'Test' }]
      }
    };
    const result = getListItems<TestItem>(payload);
    expect(result[0].id).toBe(1);
    expect(result[0].name).toBe('Test');
  });

  it('karmaşık nested object\'leri korur', () => {
    const payload = {
      data: {
        items: [
          { id: 1, nested: { value: 'test' } },
          { id: 2, nested: { value: 'test2' } }
        ]
      }
    };
    const result = getListItems<{ nested: { value: string } }>(payload);
    expect(result[0]?.nested?.value).toBe('test');
    expect(result[1]?.nested?.value).toBe('test2');
  });

  it('hata durumunda boş array döner (try-catch)', () => {
    // Circular reference gibi hatalı durumlar için
    const circular: any = { data: {} };
    circular.data.items = circular;
    const result = getListItems(circular);
    expect(result).toEqual([]);
  });
});

