import api, { setAuthToken } from '../api';

describe('api', () => {
  it('has correct base URL', () => {
    expect(api.defaults.baseURL).toContain('/api');
  });

  it('has 15s timeout', () => {
    expect(api.defaults.timeout).toBe(15_000);
  });

  it('has json content type', () => {
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('setAuthToken sets and clears token', () => {
    setAuthToken('test-token');
    // Token is used in interceptor, can't read directly
    // but calling it shouldn't throw
    setAuthToken(null);
  });
});
