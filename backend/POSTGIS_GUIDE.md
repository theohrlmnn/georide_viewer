# Guide PostGIS pour GeoRide Viewer

## 🗺️ Vue d'ensemble

Ce projet utilise **PostGIS** pour stocker et interroger efficacement les données géographiques des trajets GeoRide. PostGIS ajoute des capacités spatiales à PostgreSQL avec des index GIST pour des performances optimales.

## 📋 Structure des données géométriques

### Table `trips`
```sql
-- Points de départ et d'arrivée
startGeom GEOMETRY(POINT, 4326)     -- Point de départ
endGeom GEOMETRY(POINT, 4326)       -- Point d'arrivée
routeGeom GEOMETRY(LINESTRING, 4326) -- Trajectoire complète
```

### Table `trip_positions`
```sql
geom GEOMETRY(POINT, 4326)          -- Position géographique de chaque point
```

### Index GIST créés
```sql
-- Optimisation des requêtes spatiales
idx_trips_start_geom    -- Index sur les points de départ
idx_trips_end_geom      -- Index sur les points d'arrivée  
idx_trips_route_geom    -- Index sur les trajectoires
idx_trip_positions_geom -- Index sur les positions
```

## 🚀 Fonctionnalités disponibles

### 1. Recherche de proximité
**Endpoint:** `GET /trips/near?lon=2.3522&lat=48.8566&radius=1000`

Trouve tous les trajets qui commencent ou finissent dans un rayon donné d'un point.

**Paramètres:**
- `lon`: Longitude (requis)
- `lat`: Latitude (requis) 
- `radius`: Rayon en mètres (défaut: 1000m)

**Exemple:**
```bash
curl "http://localhost:4000/trips/near?lon=2.3522&lat=48.8566&radius=5000"
```

### 2. Distance entre trajets
**Endpoint:** `GET /trips/distance/:id1/:id2`

Calcule la distance entre deux trajectoires complètes.

**Exemple:**
```bash
curl "http://localhost:4000/trips/distance/123/456"
```

**Réponse:**
```json
{
  "trip1": 123,
  "trip2": 456, 
  "distanceMeters": 2847.33,
  "distanceKm": 2.85
}
```

## 🛠️ Utilisation avancée

### Requêtes spatiales personnalisées

```typescript
import { SpatialQueries } from './utils/geometryUtils';

// Trajets près d'un point
const nearbyTrips = await SpatialQueries.findTripsNearPoint(
  2.3522, 48.8566, 1000
);

// Distance entre trajets
const distance = await SpatialQueries.distanceBetweenTrips(123, 456);
```

### Construction automatique des géométries

Les géométries sont automatiquement créées lors de l'importation :

1. **Points de départ/arrivée** : Créés à partir de `startLat/startLon` et `endLat/endLon`
2. **Trajectoire complète** : Construite à partir de toutes les positions du trajet
3. **Positions** : Chaque position GPS devient un point PostGIS

## 📊 Exemples de requêtes SQL PostGIS

### Trajets dans un rayon de 5km de Paris
```sql
SELECT id, "trackerId", distance
FROM trips 
WHERE ST_DWithin(
  startGeom::geography, 
  ST_SetSRID(ST_MakePoint(2.3522, 48.8566), 4326)::geography, 
  5000
);
```

### Longueur réelle d'un trajet (en mètres)
```sql
SELECT id, ST_Length(routeGeom::geography) as longueur_metres
FROM trips 
WHERE routeGeom IS NOT NULL;
```

### Trajets qui se croisent
```sql
SELECT t1.id as trip1, t2.id as trip2
FROM trips t1, trips t2
WHERE t1.id < t2.id 
  AND ST_Intersects(t1.routeGeom, t2.routeGeom);
```

### Centre géographique d'un trajet
```sql
SELECT id, ST_AsGeoJSON(ST_Centroid(routeGeom)) as centre
FROM trips 
WHERE routeGeom IS NOT NULL;
```

## ⚡ Performances

Les index GIST permettent des requêtes spatiales très rapides même sur de gros volumes :

- **Recherche de proximité** : O(log n) au lieu de O(n)
- **Intersections** : Optimisées par les index spatiaux
- **Distance** : Calculs géodésiques précis

## 🔧 Maintenance

### Reconstruire les géométries de route
```typescript
import { buildRouteGeometrySimple } from './utils/geometryUtils';

// Pour un trajet spécifique
await buildRouteGeometrySimple(tripId);
```

### Statistiques spatiales
```sql
-- Nombre de trajets avec géométries
SELECT 
  COUNT(*) as total_trips,
  COUNT(startGeom) as with_start_geom,
  COUNT(routeGeom) as with_route_geom
FROM trips;
```

## 📝 Notes techniques

- **SRID 4326** : Système de coordonnées WGS84 (GPS standard)
- **Geography vs Geometry** : Geography pour les calculs de distance précis
- **GeoJSON** : Format de sortie standard pour l'interopérabilité
- **Performance** : Index GIST optimisés pour les requêtes spatiales fréquentes

## 🆕 Prochaines fonctionnalités

- [ ] Zones d'intérêt (polygones)
- [ ] Clustering de trajets similaires  
- [ ] Heatmaps de densité de trajets
- [ ] Analyse de patterns de déplacement
