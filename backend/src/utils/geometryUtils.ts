// utils/geometryUtils.ts
import pool from '../db';

/**
 * Construit la géométrie de route (LineString) pour un trajet à partir de ses positions
 * @param tripId ID du trajet
 * @returns Promise<void>
 */
export async function buildRouteGeometry(tripId: number): Promise<void> {
  try {
    // Récupérer les positions ordonnées par temps
    const positionsRes = await pool.query(`
      SELECT longitude, latitude 
      FROM trip_positions 
      WHERE idTrip = $1 
      ORDER BY fixtime ASC
    `, [tripId]);

    if (positionsRes.rows.length < 2) {
      console.log(`⚠️ Pas assez de positions pour créer une route pour le trajet ${tripId}`);
      return;
    }

    // Construire la LineString PostGIS à partir des positions
    const coordinates = positionsRes.rows.map(pos => `${pos.longitude} ${pos.latitude}`).join(',');
    
    await pool.query(`
      UPDATE trips 
      SET routeGeom = ST_SetSRID(ST_MakeLine(ARRAY[${positionsRes.rows.map((_, idx) => `ST_MakePoint($${idx * 2 + 2}, $${idx * 2 + 3})`).join(',')}]), 4326)
      WHERE id = $1
    `, [
      tripId,
      ...positionsRes.rows.flatMap(pos => [pos.longitude, pos.latitude])
    ]);

    console.log(`✅ Géométrie de route créée pour le trajet ${tripId} avec ${positionsRes.rows.length} points`);
  } catch (error) {
    console.error(`❌ Erreur lors de la création de la géométrie de route pour le trajet ${tripId}:`, error);
  }
}

/**
 * Fonction utilitaire pour construire une LineString plus simplement
 * @param tripId ID du trajet
 */
export async function buildRouteGeometrySimple(tripId: number): Promise<void> {
  try {
    await pool.query(`
      UPDATE trips 
      SET routeGeom = (
        SELECT ST_MakeLine(geom ORDER BY fixtime ASC)
        FROM trip_positions 
        WHERE idTrip = $1
      )
      WHERE id = $1
    `, [tripId]);

    console.log(`✅ Géométrie de route créée pour le trajet ${tripId}`);
  } catch (error) {
    console.error(`❌ Erreur lors de la création de la géométrie de route pour le trajet ${tripId}:`, error);
  }
}

/**
 * Fonctions utilitaires pour les requêtes spatiales
 */
export class SpatialQueries {
  
  /**
   * Trouve les trajets dans un rayon donné d'un point
   * @param longitude 
   * @param latitude 
   * @param radiusMeters Rayon en mètres
   * @returns Promise<any[]>
   */
  static async findTripsNearPoint(longitude: number, latitude: number, radiusMeters: number): Promise<any[]> {
    const res = await pool.query(`
      SELECT id, "trackerId", "startTime", "endTime", distance, "averageSpeed"
      FROM trips 
      WHERE ST_DWithin(
        startGeom::geography, 
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
        $3
      ) 
      OR ST_DWithin(
        endGeom::geography, 
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
        $3
      )
      ORDER BY ST_Distance(
        startGeom::geography, 
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      )
    `, [longitude, latitude, radiusMeters]);
    
    return res.rows;
  }

  /**
   * Trouve les trajets qui intersectent une zone (polygon)
   * @param wktPolygon Polygon au format WKT
   * @returns Promise<any[]>
   */
  static async findTripsIntersectingArea(wktPolygon: string): Promise<any[]> {
    const res = await pool.query(`
      SELECT id, "trackerId", "startTime", "endTime", distance, "averageSpeed"
      FROM trips 
      WHERE ST_Intersects(routeGeom, ST_GeomFromText($1, 4326))
      OR ST_Within(startGeom, ST_GeomFromText($1, 4326))
      OR ST_Within(endGeom, ST_GeomFromText($1, 4326))
    `, [wktPolygon]);
    
    return res.rows;
  }

  /**
   * Calcule la distance entre deux trajets
   * @param tripId1 
   * @param tripId2 
   * @returns Promise<number> Distance en mètres
   */
  static async distanceBetweenTrips(tripId1: number, tripId2: number): Promise<number> {
    const res = await pool.query(`
      SELECT ST_Distance(
        t1.routeGeom::geography,
        t2.routeGeom::geography
      ) as distance
      FROM trips t1, trips t2
      WHERE t1.id = $1 AND t2.id = $2
    `, [tripId1, tripId2]);
    
    return res.rows[0]?.distance || 0;
  }
}
