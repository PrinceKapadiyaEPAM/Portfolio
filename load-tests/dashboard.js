import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const failRate    = new Rate('failed_requests');
const marketTrend = new Trend('market_api_duration');

export const options = {
  stages: [
    { duration: '30s', target: 10  },  // ramp up
    { duration: '1m',  target: 50  },  // hold at 50 VU
    { duration: '30s', target: 0   },  // ramp down
  ],
  thresholds: {
    http_req_duration:  ['p(95)<500'],
    failed_requests:    ['rate<0.01'],
    market_api_duration: ['p(95)<800'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000/api';
const TOKEN    = __ENV.JWT_TOKEN || '';

const headers = {
  'Content-Type':  'application/json',
  'Authorization': `Bearer ${TOKEN}`,
};

export default function () {
  // Health check
  const health = http.get(`${BASE_URL}/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  // Market indices
  const indices = http.get(`${BASE_URL}/market/indices`, { headers });
  check(indices, { 'indices 200': (r) => r.status === 200 });
  marketTrend.add(indices.timings.duration);
  failRate.add(indices.status !== 200);

  // Market status
  const status = http.get(`${BASE_URL}/market/status`, { headers });
  check(status, { 'status 200': (r) => r.status === 200 });
  failRate.add(status.status !== 200);

  // Gainers / losers
  const movers = http.get(`${BASE_URL}/market/movers`, { headers });
  check(movers, { 'movers 200': (r) => r.status === 200 });
  failRate.add(movers.status !== 200);

  // Screener (no filters — snapshot read)
  const screener = http.get(`${BASE_URL}/screener/results?limit=50`, { headers });
  check(screener, { 'screener 200': (r) => r.status === 200 });
  failRate.add(screener.status !== 200);

  sleep(1);
}
