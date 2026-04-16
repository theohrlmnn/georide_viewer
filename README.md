# GeoRide Viewer

## 📌 Présentation
GeoRide Viewer est une application **full-stack** permettant d'afficher, filtrer et importer des trajets GPS issus de l'API GeoRide.  
Elle est conçue pour être **fluide**, **fiable** et **extensible**, avec une architecture claire adaptée aux environnements de production.

L'objectif est double :
1. **Import sélectif** des trajets (sans doublons) en base PostgreSQL + PostGIS.
2. **Visualisation multi-trajets** sur une carte interactive avec légende, filtres et statistiques.

---

## 🚀 Stack technique

### **Frontend**
- **React** + **Vite** pour la rapidité et la simplicité de build
- **TailwindCSS** pour un design moderne et responsive (style iOS glassmorphism)
- **Leaflet** (react-leaflet) pour la carte interactive
- **Zustand** pour la gestion d'état global (trips, filtres, cache)
- Support prévu **PWA** (Progressive Web App) pour usage mobile

### **Backend**
- **Node.js** + **Express** pour la gestion des routes REST
- **PostgreSQL** + **PostGIS** pour le stockage et l'indexation spatiale
- **Architecture en couches** : providers (sources), services (métier), repositories (SQL)
- Gestion automatique du token GeoRide (30 j) avec rafraîchissement planifié (~J+25)

### **Docker**
- 3 services : backend, frontend, base de données
- Environnement reproductible et portable

---

## 📊 Fonctionnalités

### ✅ Déjà en place
- 🔄 **Import sélectif** des trajets depuis GeoRide avec anti-doublons
- 🗺 **Affichage multi-trajets** sur carte avec couleurs stables par trajet
- 📅 **Filtres par date** (sélection de plage)
- 🎯 **Sélection manuelle** des trajets à afficher
- ⚡ **Cache GeoJSON** pour éviter les recharges inutiles
- 📦 Architecture claire et extensible
- 📐 **Statistiques** (distance, durée, vitesse moyenne)
- 📉 **Simplification polylignes** côté backend (Douglas‑Peucker, tolérance ajustable via `?tolerance=`)
### 🛠 À implémenter

- 🔽 Sélecteur de `trackerId` dynamique
- 🗄 Ajout de `geom` (PostGIS) et index GIST
- ⬇️ Import direct depuis la liste GeoRide
- 📊 Panneau de statistiques globales
- 📱 Support complet PWA

---

## 🛠 API (conventions REST)

- **Local (DB)**  
  - `GET /trips` → liste des trajets en base  
  - `GET /trips/:id/geojson` → tracé d’un trajet  
  - `POST /trips/import` → import depuis GeoRide  
  - `DELETE /trips/:id` → suppression  

- **GeoRide (API externe)**  
  - `GET /georide/trips?trackerId=...&from=...&to=...` → liste disponible à l'import  
  - `GET /georide/trips/:tripId/geojson?trackerId=...&from=...&to=...` → tracé d’un trajet

---

## 📂 Structure du projet

```
.
├── backend/       # Node.js + Express + PostgreSQL/PostGIS
│   ├── src/
│   │   ├── providers/    # Sources de données (GeoRide, local)
│   │   ├── services/     # Logique métier
│   │   ├── repositories/ # Accès BDD
│   │   ├── db/           # Connexion et init BDD
│   │   └── utils/        # Utilitaires
│   └── dockerfile
├── frontend/      # React + Vite + Leaflet + Tailwind
│   ├── src/
│   │   ├── components/   # Composants UI
│   │   ├── store/        # État global (Zustand)
│   │   └── types/        # Types TS
│   └── dockerfile
├── db/            # Scripts init BDD
└── docker-compose.yml
```

Il est conçu pour évoluer vers une **application complète de gestion et visualisation GPS**.

---

## 📋 Déploiement et Production

### Checklist de déploiement
Pour un déploiement en production sécurisé et fiable, consultez la **[Checklist de Déploiement](./DEPLOYMENT_CHECKLIST.md)** qui couvre :

- ✅ **Configuration** et pré-requis
- ✅ **Tests** et validation des fonctionnalités  
- ✅ **Sécurité** et gestion des secrets
- ✅ **Conteneurisation** Docker
- ✅ **Monitoring** et maintenance
- ✅ **Procédures d'urgence** et rollback
- ✅ **Système de versioning** de base de données
- ✅ **Régénération** depuis les données brutes

### Fonctionnalités de production
- 🔄 **Migration de base de données** avec versioning
- 📦 **Régénération des données** depuis les sources brutes GeoRide
- 🐳 **Conteneurisation** complète avec Docker Compose
- 📊 **Monitoring** avec métriques et health checks
- 🔒 **Sécurité** avec gestion des secrets et variables d'environnement
- ⚡ **Cache intelligent** pour optimiser les performances
- 🗄️ **PostGIS** avec index spatiaux pour les requêtes géographiques

---

## 🚀 Installation et Développement

### Pré-requis
- Node.js 18+
- PostgreSQL 15+ avec PostGIS
- Clés API GeoRide

### Démarrage rapide
```bash
# Cloner le projet
git clone <repo-url>
cd georide-viewer

# Backend
cd backend
npm install
cp .env.example .env  # Configurer les variables
npm run dev

# Frontend (nouveau terminal)
cd frontend  
npm install
npm run dev
```

### Configuration
1. Créer la base de données PostgreSQL
2. Configurer les variables d'environnement (`.env`)
3. Lancer les migrations : `npm run db:migrate`
4. Importer des données de test

---
