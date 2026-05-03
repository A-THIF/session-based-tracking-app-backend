import axios from 'axios';
import polyline from '@mapbox/polyline';

// Read keys from Render Environment Variables
const STADIA_KEY = process.env.STADIA_API_KEY;
const ORS_KEY = process.env.ORS_API_KEY;

/**
 * Waterfall Routing Logic
 * 1. Stadia Maps (Valhalla) -> 6-digit precision
 * 2. OpenRouteService (Backup) -> GeoJSON coordinates
 */
export const getRoutePath = async (req, res) => {
  const { startLat, startLng, endLat, endLng } = req.query;

  if (!startLat || !startLng || !endLat || !endLng) {
    return res.status(400).json({ error: "Missing start or end coordinates" });
  }

  try {
    // --- STEP 1: TRY STADIA MAPS (Primary) ---
    console.log("🛣️ Attempting Stadia Routing...");
    const stadiaUrl = `https://api.stadiamaps.com/route/v1?api_key=${STADIA_KEY}`;
    
    const stadiaResponse = await axios.post(stadiaUrl, {
      locations: [
        { lat: parseFloat(startLat), lon: parseFloat(startLng) },
        { lat: parseFloat(endLat), lon: parseFloat(endLng) }
      ],
      costing: "auto",
      units: "meters"
    });

    const shape = stadiaResponse.data.trip.legs[0].shape;
    
    // Stadia uses precision 6. Mapbox polyline decodes to [lat, lng]
    const decoded = polyline.decode(shape, 6);
    
    const points = decoded.map(p => ({
      latitude: p[0],
      longitude: p[1]
    }));

    return res.json({ provider: "stadia", points });

  } catch (error) {
    console.error("⚠️ Stadia Routing Failed, falling back to ORS...");

    try {
      // --- STEP 2: TRY OPENROUTE SERVICE (Backup) ---
      // Note: ORS uses [lng, lat] format for the URL
      const orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car`;
      
      const orsResponse = await axios.get(orsUrl, {
        params: {
          api_key: ORS_KEY,
          start: `${startLng},${startLat}`,
          end: `${endLng},${endLat}`
        }
      });

      // ORS returns GeoJSON coordinates: [lng, lat]
      const coords = orsResponse.data.features[0].geometry.coordinates;
      
      const points = coords.map(c => ({
        latitude: c[1],
        longitude: c[0]
      }));

      return res.json({ provider: "ors", points });

    } catch (orsError) {
      console.error("❌ Both Routing Services Failed.");
      
      // --- STEP 3: FINAL FALLBACK (Straight Line) ---
      return res.json({ 
        provider: "fallback", 
        points: [
          { latitude: parseFloat(startLat), longitude: parseFloat(startLng) },
          { latitude: parseFloat(endLat), longitude: parseFloat(endLng) }
        ] 
      });
    }
  }
};