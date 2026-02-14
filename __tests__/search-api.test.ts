import { searchProducts } from '@/lib/api/search';
import { apiRequest } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  apiRequest: jest.fn(),
}));

const apiRequestMock = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('searchProducts', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({
      found: 0,
      page: 1,
      pageSize: 24,
      hits: [],
    });
  });

  it('serializes required storeId and repeatable filters', async () => {
    await searchProducts({
      storeId: 12,
      query: 'rice',
      category: ['Grains', 'Rice'],
      brand: ['Daawat'],
      page: 2,
      pageSize: 24,
    });

    const endpoint = apiRequestMock.mock.calls[0]?.[0] as string;
    const queryString = endpoint.split('?')[1] ?? '';
    const queryParams = new URLSearchParams(queryString);

    expect(endpoint.startsWith('/api/search/items?')).toBe(true);
    expect(queryParams.get('storeId')).toBe('12');
    expect(queryParams.get('query')).toBe('rice');
    expect(queryParams.getAll('category')).toEqual(['Grains', 'Rice']);
    expect(queryParams.getAll('brand')).toEqual(['Daawat']);
    expect(queryParams.get('page')).toBe('2');
    expect(queryParams.get('pageSize')).toBe('24');
  });

  it('clamps page/pageSize to backend-safe limits', async () => {
    await searchProducts({
      storeId: 7,
      page: 0,
      pageSize: 1000,
    });

    const endpoint = apiRequestMock.mock.calls[0]?.[0] as string;
    const queryString = endpoint.split('?')[1] ?? '';
    const queryParams = new URLSearchParams(queryString);

    expect(queryParams.get('storeId')).toBe('7');
    expect(queryParams.get('query')).toBe('*');
    expect(queryParams.get('page')).toBe('1');
    expect(queryParams.get('pageSize')).toBe('100');
  });
});
