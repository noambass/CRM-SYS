// Vercel Serverless Function
// Returns route duration (seconds) and distance (meters) between origin and destination.
// Supports traffic-aware routing via Google Routes API when GOOGLE_ROUTES_API_KEY is provided.

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { origin, destination, departureTime } = req.body || {};
    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return res.status(400).json({ error: 'origin and destination are required' });
    }

    const key = process.env.GOOGLE_ROUTES_API_KEY;
    if (!key) {
      // Fallback: approximate using haversine + average speed 45km/h.
      const toRad = (d) => (d * Math.PI) / 180;
      const R = 6371000;
      const dLat = toRad(destination.lat - origin.lat);
      const dLng = toRad(destination.lng - origin.lng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(origin.lat)) * Math.cos(toRad(destination.lat)) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = R * c;
      const avgSpeedMps = 45_000 / 3600;
      const duration = Math.max(60, Math.round(dist / avgSpeedMps));
      return res.status(200).json({ durationSeconds: duration, distanceMeters: Math.round(dist), provider: 'fallback' });
    }

    const body = {
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
    };
    if (departureTime) body.departureTime = departureTime;

    const resp = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        // Keep response small
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(502).json({ error: 'Routes API failed', details: text });
    }
    const data = await resp.json();
    const r = data?.routes?.[0];
    const durationStr = r?.duration || '0s';
    const durationSeconds = parseInt(durationStr.replace('s', ''), 10) || 0;
    const distanceMeters = r?.distanceMeters || 0;
    return res.status(200).json({ durationSeconds, distanceMeters, provider: 'google' });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error', details: String(err?.message || err) });
  }
}
