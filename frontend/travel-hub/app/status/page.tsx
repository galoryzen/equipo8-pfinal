'use client';

import { useEffect, useState } from 'react';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'https://api.travelhub.galoryzen.xyz'}/api/v1`;

const SERVICES = [
  { name: 'Auth', path: 'auth' },
  { name: 'Catalog', path: 'catalog' },
  { name: 'Booking', path: 'booking' },
  { name: 'Payment', path: 'payment' },
  { name: 'Notifications', path: 'notifications' },
];

interface ServiceStatus {
  name: string;
  status: 'loading' | 'ok' | 'error';
  detail?: string;
}

export default function LandingPage() {
  const [services, setServices] = useState<ServiceStatus[]>(
    SERVICES.map((s) => ({ name: s.name, status: 'loading' }))
  );

  useEffect(() => {
    SERVICES.forEach((svc, i) => {
      fetch(`${API_URL}/${svc.path}/health`)
        .then((res) => res.json())
        .then((data) => {
          setServices((prev) => {
            const next = [...prev];
            next[i] = { name: svc.name, status: 'ok', detail: JSON.stringify(data) };
            return next;
          });
        })
        .catch((err) => {
          setServices((prev) => {
            const next = [...prev];
            next[i] = { name: svc.name, status: 'error', detail: String(err) };
            return next;
          });
        });
    });
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>TravelHub — Status</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333' }}>
            <th style={{ textAlign: 'left', padding: 8 }}>Service</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Response</th>
          </tr>
        </thead>
        <tbody>
          {services.map((svc) => (
            <tr key={svc.name} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: 8 }}>{svc.name}</td>
              <td style={{ padding: 8 }}>
                {svc.status === 'loading' && '..'}
                {svc.status === 'ok' && 'OK'}
                {svc.status === 'error' && 'ERROR'}
              </td>
              <td style={{ padding: 8, fontSize: 13, fontFamily: 'monospace' }}>
                {svc.detail ?? ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
