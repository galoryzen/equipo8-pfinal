import api from '@src/services/api';
import {
  getFeaturedDestinations,
  getFeaturedProperties,
} from '../catalog-service';

jest.mock('@src/services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('catalog-service', () => {
  afterEach(() => jest.clearAllMocks());

  describe('getFeaturedDestinations', () => {
    it('calls the correct endpoint with default limit', async () => {
      mockedApi.get.mockResolvedValue({ data: [] });

      await getFeaturedDestinations();

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/v1/catalog/destinations/featured',
        { params: { limit: 4 } },
      );
    });

    it('passes custom limit', async () => {
      mockedApi.get.mockResolvedValue({ data: [] });

      await getFeaturedDestinations(6);

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/v1/catalog/destinations/featured',
        { params: { limit: 6 } },
      );
    });

    it('returns data from response', async () => {
      const mockData = [
        { id: '1', name: 'Cancún', country: 'México', image_url: 'https://example.com/cancun.jpg' },
      ];
      mockedApi.get.mockResolvedValue({ data: mockData });

      const result = await getFeaturedDestinations();

      expect(result).toEqual(mockData);
    });
  });

  describe('getFeaturedProperties', () => {
    it('calls the correct endpoint with default limit', async () => {
      mockedApi.get.mockResolvedValue({ data: [] });

      await getFeaturedProperties();

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/v1/catalog/properties/featured',
        { params: { limit: 10 } },
      );
    });

    it('passes custom limit', async () => {
      mockedApi.get.mockResolvedValue({ data: [] });

      await getFeaturedProperties(5);

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/v1/catalog/properties/featured',
        { params: { limit: 5 } },
      );
    });

    it('returns data from response', async () => {
      const mockData = [
        {
          id: '1',
          name: 'Hotel Test',
          city: { id: '1', name: 'Cancún', country: 'México' },
          rating_avg: 4.5,
          review_count: 10,
          min_price: 120,
          amenities: [],
        },
      ];
      mockedApi.get.mockResolvedValue({ data: mockData });

      const result = await getFeaturedProperties();

      expect(result).toEqual(mockData);
    });
  });
});
