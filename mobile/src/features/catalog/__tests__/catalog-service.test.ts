import api from '@src/services/api';
import {
  getAmenities,
  getFeaturedDestinations,
  getFeaturedProperties,
  getPropertyDetail,
  searchCities,
  searchProperties,
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

  describe('getAmenities', () => {
    it('calls the correct endpoint', async () => {
      mockedApi.get.mockResolvedValue({ data: [] });

      await getAmenities();

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/catalog/amenities');
    });

    it('returns data from response', async () => {
      const mockData = [
        { code: 'wifi', name: 'Wi-Fi gratuito' },
        { code: 'pool', name: 'Piscina' },
      ];
      mockedApi.get.mockResolvedValue({ data: mockData });

      const result = await getAmenities();

      expect(result).toEqual(mockData);
    });
  });

  describe('searchCities', () => {
    it('calls the correct endpoint with query param', async () => {
      mockedApi.get.mockResolvedValue({ data: [] });

      await searchCities('Can');

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/catalog/cities', {
        params: { q: 'Can' },
      });
    });

    it('returns data from response', async () => {
      const mockCities = [
        { id: '1', name: 'Cancún', country: 'México', department: 'Quintana Roo' },
      ];
      mockedApi.get.mockResolvedValue({ data: mockCities });

      const result = await searchCities('Can');

      expect(result).toEqual(mockCities);
    });
  });

  describe('searchProperties', () => {
    it('calls the correct endpoint with required params', async () => {
      mockedApi.get.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } });

      await searchProperties({
        checkin: '2026-04-01',
        checkout: '2026-04-05',
        guests: 2,
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/catalog/properties', {
        params: { checkin: '2026-04-01', checkout: '2026-04-05', guests: 2 },
      });
    });

    it('includes optional filters when provided', async () => {
      mockedApi.get.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } });

      await searchProperties({
        checkin: '2026-04-01',
        checkout: '2026-04-05',
        guests: 2,
        city_id: 'city-123',
        min_price: 50,
        max_price: 200,
        amenities: ['FREE_WIFI', 'POOL'],
        sort_by: 'price_asc',
        page: 2,
        page_size: 10,
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/v1/catalog/properties', {
        params: {
          checkin: '2026-04-01',
          checkout: '2026-04-05',
          guests: 2,
          city_id: 'city-123',
          min_price: 50,
          max_price: 200,
          amenities: 'FREE_WIFI,POOL',
          sort_by: 'price_asc',
          page: 2,
          page_size: 10,
        },
      });
    });

    it('omits optional params when not provided', async () => {
      mockedApi.get.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 } });

      await searchProperties({
        checkin: '2026-04-01',
        checkout: '2026-04-05',
        guests: 1,
      });

      const callParams = mockedApi.get.mock.calls[0][1]?.params;
      expect(callParams).not.toHaveProperty('city_id');
      expect(callParams).not.toHaveProperty('amenities');
      expect(callParams).not.toHaveProperty('min_price');
      expect(callParams).not.toHaveProperty('max_price');
    });

    it('returns paginated response', async () => {
      const mockResponse = {
        items: [{ id: '1', name: 'Hotel Test' }],
        total: 1,
        page: 1,
        page_size: 20,
        total_pages: 1,
      };
      mockedApi.get.mockResolvedValue({ data: mockResponse });

      const result = await searchProperties({
        checkin: '2026-04-01',
        checkout: '2026-04-05',
        guests: 1,
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPropertyDetail', () => {
    it('calls the correct endpoint with property id and no date params by default', async () => {
      mockedApi.get.mockResolvedValue({ data: { detail: {}, reviews: {} } });

      await getPropertyDetail('prop-123');

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/v1/catalog/properties/prop-123',
        { params: {} },
      );
    });

    it('forwards checkin and checkout as query params', async () => {
      mockedApi.get.mockResolvedValue({ data: { detail: {}, reviews: {} } });

      await getPropertyDetail('prop-123', {
        checkin: '2026-06-01',
        checkout: '2026-06-03',
      });

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/v1/catalog/properties/prop-123',
        { params: { checkin: '2026-06-01', checkout: '2026-06-03' } },
      );
    });

    it('omits undefined date params', async () => {
      mockedApi.get.mockResolvedValue({ data: { detail: {}, reviews: {} } });

      await getPropertyDetail('prop-123', { checkin: '2026-06-01' });

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/v1/catalog/properties/prop-123',
        { params: { checkin: '2026-06-01' } },
      );
    });

    it('forwards review pagination params', async () => {
      mockedApi.get.mockResolvedValue({ data: { detail: {}, reviews: {} } });

      await getPropertyDetail('prop-123', {
        review_page: 2,
        review_page_size: 5,
      });

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/v1/catalog/properties/prop-123',
        { params: { review_page: 2, review_page_size: 5 } },
      );
    });

    it('omits review pagination params when not provided', async () => {
      mockedApi.get.mockResolvedValue({ data: { detail: {}, reviews: {} } });

      await getPropertyDetail('prop-123');

      const callParams = mockedApi.get.mock.calls[0][1]?.params;
      expect(callParams).not.toHaveProperty('review_page');
      expect(callParams).not.toHaveProperty('review_page_size');
    });

    it('returns property detail response', async () => {
      const mockResponse = {
        detail: {
          id: 'prop-123',
          name: 'Hotel Test',
          description: 'A nice hotel',
          amenities: [{ code: 'wifi', name: 'Wi-Fi' }],
        },
        reviews: { items: [], total: 0, page: 1, page_size: 10, total_pages: 0 },
      };
      mockedApi.get.mockResolvedValue({ data: mockResponse });

      const result = await getPropertyDetail('prop-123');

      expect(result).toEqual(mockResponse);
    });
  });
});
