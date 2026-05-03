import axios from 'axios';
import polyline from '@mapbox/polyline';

// Render Environment Variables
const STADIA_KEY = process.env.STADIA_API_KEY;
const ORS_KEY = process.env.ORS_API_KEY;

/**
 * Waterfall Routing Logic
 * 1. Stadia Maps
 * 2. OpenRouteService
 * 3. Straight-line fallback
 */
export const getRoutePath = async (req, res) => {
  const { startLat, startLng, endLat, endLng } = req.query;

  if (!startLat || !startLng || !endLat || !endLng) {
    return res.status(400).json({
      error: "Missing start or end coordinates"
    });
  }

  try {
    // ───────────── STADIA (PRIMARY) ─────────────
    const stadiaUrl = `https://api.stadiamaps.com/route/v1?api_key=${STADIA_KEY}`;

    const stadiaResponse = await axios.post(stadiaUrl, {
      locations: [
        {
          lat: parseFloat(startLat),
          lon: parseFloat(startLng)
        },
        {
          lat: parseFloat(endLat),
          lon: parseFloat(endLng)
        }
      ],
      costing: "auto",
      units: "meters"
    });

    const trip = stadiaResponse.data.trip;
    const leg = trip.legs[0];
    const summary = trip.summary;

    const decoded = polyline.decode(leg.shape, 6);

    const points = decoded.map((p) => ({
      latitude: p[0],
      longitude: p[1]
    }));

    return res.json({
      provider: "stadia",
      points,
      distanceMeters: summary.length,
      durationSeconds: summary.time
    });

  } catch (stadiaError) {
    console.error("⚠️ Stadia failed:", stadiaError.message);
    console.log("Trying ORS fallback...");

    try {
      // ───────────── ORS (BACKUP) ─────────────
      const orsUrl =
        "https://api.openrouteservice.org/v2/directions/driving-car";

      const orsResponse = await axios.get(orsUrl, {
        params: {
          api_key: ORS_KEY,
          start: `${startLng},${startLat}`,
          end: `${endLng},${endLat}`
        }
      });

      const feature = orsResponse.data.features[0];
      const summary = feature.properties.summary;

      const points = feature.geometry.coordinates.map((c) => ({
        latitude: c[1],
        longitude: c[0]
      }));

      return res.json({
        provider: "ors",
        points,
        distanceMeters: summary.distance,
        durationSeconds: summary.duration
      });

    } catch (orsError) {
      console.error("❌ ORS failed:", orsError.message);

      // ───────────── FINAL FALLBACK ─────────────
      return res.json({
        provider: "fallback",
        points: [
          {
            latitude: parseFloat(startLat),
            longitude: parseFloat(startLng)
          },
          {
            latitude: parseFloat(endLat),
            longitude: parseFloat(endLng)
          }
        ],
        distanceMeters: null,
        durationSeconds: null
      });
    }
  }
};