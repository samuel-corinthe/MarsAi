# MarsAI - README Technique Complet (Audit codebase)

Ce document est un audit complet du projet `MarsAI` (backend + frontend + scripts + tests), avec references `fichier:ligne` pour retrouver rapidement chaque logique.

Objectifs:
- donner une vue technique fiable du site
- documenter chaque fonctionnalite metier
- lister les pages, routes, services, composants et scripts clefs
- fournir une base de maintenance/deploiement sans zone floue

---

## 0) Comment lire ce document

- Les references sont au format `chemin:ligne`.
- Les sections 3 et 4 donnent la lecture metier ("a quoi ca sert").
- Les annexes donnent l'inventaire quasi exhaustif (routes + exports).
- Quand une fonctionnalite touche plusieurs couches, la chaine complete est decrite (UI -> API -> service -> DB).

---

## 1) Resume produit

`MarsAI` est une plateforme festival film IA avec:
- CMS WordPress (pages contenu, agenda)
- galerie de films par phase
- upload de films (video + poster + sous-titres) avec validations fortes
- dashboard admin/superadmin (notes, assignations, selections)
- gouvernance de phases (`phase_1` -> `phase_2` -> `phase_3`) avec garde-fous
- stockage media S3 (Scaleway) + publication YouTube

References:
- `frontend/src/App.jsx:36`
- `backend/controllers/uploadController.js:158`
- `backend/services/sitePhaseService.js:544`
- `backend/services/objectStorageService.js:250`

---

## 2) Stack et architecture

### 2.1 Frontend

- React + Vite + React Router
- i18next (FR/EN)
- Theme context (light/dark)
- Unhead SEO + schemas JSON-LD
- tests Vitest + Testing Library

References:
- `frontend/src/main.jsx:11`
- `frontend/src/App.jsx:18`
- `frontend/src/context/ThemeContext.jsx:13`
- `frontend/src/components/Seo.jsx:15`
- `frontend/package.json`

### 2.2 Backend

- Node.js ESM + Express
- MySQL2 (MariaDB)
- auth session cookie JWT + sync WordPress
- AWS SDK S3 compatible (Scaleway)
- YouTube Data API upload + polling statut
- middlewares anti-abus (rate-limit, honeypot, ALTCHA, magic bytes)

References:
- `backend/app.js:1`
- `backend/db.js:1`
- `backend/services/authService.js:852`
- `backend/services/objectStorageService.js:250`
- `backend/routes/upload.js:99`

### 2.3 Flux applicatif global

1. UI appelle client API (`frontend/src/api.js`).
2. Routes backend dispatchent vers controller.
3. Controller valide HTTP + appelle service.
4. Service applique logique metier + lit/ecrit via model SQL.
5. Reponse JSON retour UI.

References:
- `frontend/src/api.js:379`
- `backend/controllers/movie.js:160`
- `backend/services/movieService.js:330`
- `backend/models/movieModel.js:1`

---

## 3) Audit Backend (par domaine)

## 3.1 Bootstrap serveur et securite

### Feature: bootstrap Express et aliases de deploiement

- CORS dynamique + credentials
- static uploads: `/uploads` et `/MarsAi/uploads`
- double prefix API: `/api/*` et `/MarsAi/api/*`
- error handler global (JSON invalides, erreurs Multer, erreurs serveur)

References:
- `backend/app.js:38`
- `backend/app.js:63`
- `backend/app.js:66`
- `backend/app.js:92`

### Feature: auth middleware route-level

- `requireAuth` lit la session JWT cookie
- `requireRole` filtre les roles

References:
- `backend/middlewares/authMiddleware.js:3`
- `backend/middlewares/authMiddleware.js:12`
- `backend/services/authService.js:885`

## 3.2 Carte API metier

### Feature: films

- `GET /api/movies` liste paginee (20)
- `GET /api/movies/:id` details film
- `GET /api/movies/:id/download` telechargement (S3/local/remote)

References:
- `backend/routes/movie.js:6`
- `backend/controllers/movie.js:160`
- `backend/controllers/movie.js:215`
- `backend/controllers/movie.js:247`

### Feature: upload

- `POST /api/upload/youtube` pipeline complet upload
- `GET /api/upload/youtube/status/:id` statut YouTube
- `GET /api/upload/countries` liste pays upload

References:
- `backend/routes/upload.js:99`
- `backend/controllers/uploadController.js:158`
- `backend/controllers/uploadController.js:388`
- `backend/controllers/uploadController.js:413`

### Feature: auth

- `POST /api/auth/wordpress/login`
- `PATCH /api/auth/me/profile`
- `GET /api/auth/me`
- `POST /api/auth/logout`

References:
- `backend/routes/auth.js:12`
- `backend/controllers/authController.js:16`
- `backend/controllers/authController.js:121`
- `backend/controllers/authController.js:251`
- `backend/controllers/authController.js:271`

### Feature: dashboard, assignations, notes

- dashboard agrégé
- assignation auto/rebalance/claim/release/status/capacity
- notes admin film

References:
- `backend/routes/dashboard.js:6`
- `backend/routes/assignments.js:15`
- `backend/routes/ratings.js:10`
- `backend/controllers/dashboardController.js:3`
- `backend/controllers/assignmentController.js:27`
- `backend/controllers/ratingController.js:11`

### Feature: phases

- etat phase courant
- selection phase 2
- selection phase 3
- validation superadmin
- passage de phase sous conditions strictes

References:
- `backend/routes/sitePhase.js:17`
- `backend/controllers/sitePhaseController.js:25`
- `backend/controllers/sitePhaseController.js:95`
- `backend/controllers/sitePhaseController.js:162`

### Feature: public/messaging

- formulaire contact
- newsletter
- endpoint ALTCHA challenge

References:
- `backend/routes/public.js:6`
- `backend/routes/altcha.js:22`
- `backend/controllers/publicController.js:8`
- `backend/services/messagingService.js:169`

## 3.3 Auth WordPress + session locale

### Feature: login WP et mapping role app

- auth REST WP (`/wp-json/wp/v2/users/me`) + fallback formulaire WP
- mapping roles WP -> roles app (`administrator -> superadmin`, `editor -> admin`)
- upsert user local `users`
- cookie session JWT (`marsai_sid` par defaut)

Fonctions clefs:
- `fetchWordPressIdentity`
- `mapWpRolesToAppRole`
- `upsertLocalUser`
- `setSessionCookie`
- `getSessionFromRequest`

References:
- `backend/services/authService.js:426`
- `backend/services/authService.js:395`
- `backend/services/authService.js:727`
- `backend/services/authService.js:864`
- `backend/services/authService.js:885`

### Feature: sync profil WP depuis dashboard

- update WP profil via formulaire admin WP
- relecture identite WP
- update user local + refresh session cookie

References:
- `backend/controllers/authController.js:121`
- `backend/services/authService.js:616`
- `backend/services/authService.js:788`

## 3.4 Upload pipeline (video/poster/subtitle)

### Feature: anti-abus et validation media

Chainage middleware upload:
- IP limiter
- concurrent limiter
- multer fields
- honeypot
- magic bytes
- ALTCHA
- validation form
- validation email
- email limiter
- nettoyage metadata

References:
- `backend/routes/upload.js:99`
- `backend/middlewares/uploadMiddleware.js:7`
- `backend/utils/HoneypotValidator.js:3`
- `backend/utils/FileTypeValidator.js:93`
- `backend/utils/AltchaValidator.js:70`
- `backend/utils/FormValidator.js:135`
- `backend/utils/EmailValidator.js:24`
- `backend/utils/MetadataCleaner.js:76`

### Feature: upload metier

- refus upload visiteur en phase 2/3
- analyse video + contraintes
- upload YouTube (private)
- upload S3 video/poster/subtitle
- insertion film + casting DB
- email confirmation

References:
- `backend/controllers/uploadController.js:158`
- `backend/controllers/uploadController.js:189`
- `backend/controllers/uploadController.js:223`
- `backend/controllers/uploadController.js:245`
- `backend/controllers/uploadController.js:300`
- `backend/controllers/uploadController.js:340`

## 3.5 Galerie films et details

### Feature: source unique S3 pour films visibles

Le service filtre les films pour ne garder que ceux dont `video_url` est sur objet storage public.

Fonctions clefs:
- `isS3MediaUrl`
- `isS3BackedMovieRow`
- `listMovies`
- `getMovieDetails`

References:
- `backend/services/movieService.js:142`
- `backend/services/movieService.js:152`
- `backend/services/movieService.js:330`
- `backend/services/movieService.js:346`

### Feature: pagination/filtre/sort backend

- page size fixe 20
- search multi champs
- filtre rating min/max
- sort titre/annee

References:
- `backend/controllers/movie.js:19`
- `backend/controllers/movie.js:116`
- `backend/controllers/movie.js:160`

### Feature: telechargement film

- session requise
- enforcement phase access
- source prioritaire: S3 stream
- fallback local uploads si present
- fallback URL mp4 remote proxy

References:
- `backend/controllers/movie.js:247`
- `backend/controllers/movie.js:272`
- `backend/controllers/movie.js:296`
- `backend/controllers/movie.js:318`
- `backend/controllers/movie.js:326`

## 3.6 Gouvernance phases (coeur metier)

### Feature: regles strictes phase_1 -> phase_2

- date fin phase 1 atteinte
- exactement 50 films selectionnes
- validation superadmin obligatoire
- role superadmin obligatoire pour transition
- suppression DB des films hors selection
- cleanup objets S3 associes + sweep orphelins

References:
- `backend/services/sitePhaseService.js:470`
- `backend/services/sitePhaseService.js:544`
- `backend/services/sitePhaseService.js:589`
- `backend/services/sitePhaseService.js:649`

### Feature: regles strictes phase_2 -> phase_3

- date fin phase 2 atteinte
- exactement 5 films phase 3
- validation superadmin obligatoire
- role superadmin obligatoire pour transition
- pas de suppression des 50 films phase 2

References:
- `backend/services/sitePhaseService.js:520`
- `backend/services/sitePhaseService.js:612`

### Feature: garde-fous selection

- quota max 50 pour phase 2
- quota max 5 pour phase 3
- phase 3 seulement si film dans selection phase 2
- phase 2/3 exigent film heberge S3

References:
- `backend/services/sitePhaseService.js:338`
- `backend/services/sitePhaseService.js:402`
- `backend/models/sitePhaseModel.js:309`

## 3.7 Assignation reviewers et rating admin

### Feature: moteur assignation

- auto assign
- rebalance
- claim/release
- statuts assignation
- workload et capacity

References:
- `backend/services/assignmentService.js:491`
- `backend/services/assignmentService.js:508`
- `backend/services/assignmentService.js:532`
- `backend/services/assignmentService.js:617`
- `backend/services/assignmentService.js:761`

### Feature: rating admin

- note 1..5 + commentaire max length
- upsert rating
- delete rating
- recalcul summary par film

References:
- `backend/services/ratingService.js:30`
- `backend/services/ratingService.js:82`
- `backend/services/ratingService.js:118`
- `backend/models/ratingModel.js:95`

## 3.8 Dashboard service

### Feature: agregation dashboard

- KPI notes/restant/selection
- liste films enrichie (rating, pays, status)
- timeline phase
- logs admin
- count newsletter

References:
- `backend/services/dashboardService.js:168`
- `backend/services/dashboardService.js:90`
- `backend/services/dashboardService.js:128`

---

## 4) Audit Frontend (pages, composants, controllers)

## 4.1 Shell applicatif

### Feature: routing + lazy loading + chrome conditionnel

- routes lazy des pages
- `Navbar`/`Footer` caches sur `/dashboard`
- fallback Suspense "Chargement..."

References:
- `frontend/src/App.jsx:7`
- `frontend/src/App.jsx:20`
- `frontend/src/App.jsx:34`

### Feature: providers globaux

- BrowserRouter
- ThemeProvider
- CookiesProvider
- UnheadProvider

References:
- `frontend/src/main.jsx:12`

## 4.2 Client API frontend

### Feature: fallback d'URL et robustesse de fetch

- fallback multi prefixes (`/api`, `/MarsAi/api`)
- fallback local hosts en dev
- validation payload movie pour eviter faux positifs HTML

References:
- `frontend/src/api.js:5`
- `frontend/src/api.js:34`
- `frontend/src/api.js:87`

### Feature: wrappers metier

- movies, movie details, contact, newsletter
- auth me/login/logout/profile
- site-phase selection/validation
- assignments, ratings

References:
- `frontend/src/api.js:379`
- `frontend/src/api.js:428`
- `frontend/src/api.js:556`
- `frontend/src/api.js:588`
- `frontend/src/api.js:718`
- `frontend/src/api.js:787`

## 4.3 Theme et controle d'acces phase

### Feature: theme system global

- mode light/dark persiste en localStorage
- applique `data-theme` sur `html` et `body`

References:
- `frontend/src/context/ThemeContext.jsx:3`
- `frontend/src/context/ThemeContext.jsx:13`

### Feature: rules de visibilite par phase/session

- cache CTA appel a projet en phase 2/3
- cache gallery pour visiteurs en phase 1
- bloque upload visiteurs phase 2/3

References:
- `frontend/src/controllers/usePhaseAccessController.js:4`
- `frontend/src/controllers/usePhaseAccessController.js:35`

## 4.4 Pages frontend (audit fonctionnel)

### Home (`frontend/src/pages/Home.jsx`)

Court intitule: page hero festival + CTA dynamique + countdown + bloc agenda WordPress.

Fonctions clefs:
- recup etat phase
- recup 5 derniers events agenda WP
- CTA hero dynamique (participer vs visionner films)
- countdown masque en phase 3
- fallback image/3D viewer dans section about

References:
- `frontend/src/pages/Home.jsx:11`
- `frontend/src/pages/Home.jsx:61`
- `frontend/src/pages/Home.jsx:80`
- `frontend/src/pages/Home.jsx:38`
- `frontend/src/pages/Home.jsx:400`
- `frontend/src/pages/Home.jsx:427`

### WpPage (`frontend/src/pages/WpPage.jsx`)

Court intitule: routeur de pages WP + pages speciales (agenda/contact/call-for-project/legal).

Fonctions clefs:
- mapping slug FR/EN + aliases
- blocage call-for-project hors phase 1
- fetch contenu page WP
- agenda dynamique depuis categorie WP
- formulaire contact local vers backend

References:
- `frontend/src/pages/WpPage.jsx:171`
- `frontend/src/pages/WpPage.jsx:242`
- `frontend/src/pages/WpPage.jsx:339`
- `frontend/src/pages/WpPage.jsx:371`
- `frontend/src/pages/WpPage.jsx:386`
- `frontend/src/pages/WpPage.jsx:546`

### Gallery (`frontend/src/pages/Gallery.jsx`)

Court intitule: galerie paginee server-side, filtres, gestion selection phase (admin), carousel phase 3.

Fonctions clefs:
- gate access selon phase/session
- fetch movies pagine backend (`pageSize=20`)
- filtre/sort/search relies au backend
- selection phase 2/3 cote admin
- top carousel winners phase 3 + preview loop 5s

References:
- `frontend/src/pages/Gallery.jsx:92`
- `frontend/src/pages/Gallery.jsx:176`
- `frontend/src/pages/Gallery.jsx:302`
- `frontend/src/pages/Gallery.jsx:429`
- `frontend/src/pages/Gallery.jsx:515`
- `frontend/src/pages/Gallery.jsx:639`

### Movie details (`frontend/src/pages/MovieDetails.jsx`)

Court intitule: detail film + player selon phase + note admin + download session.

Fonctions clefs:
- player direct mp4 en phase 1
- player YouTube embed en phase 2/3
- preview hero boucle 5s sur mp4 direct
- notes admin (get/upsert/delete)
- bouton download session vers `/api/movies/:id/download`

References:
- `frontend/src/pages/MovieDetails.jsx:26`
- `frontend/src/pages/MovieDetails.jsx:95`
- `frontend/src/pages/MovieDetails.jsx:126`
- `frontend/src/pages/MovieDetails.jsx:146`
- `frontend/src/pages/MovieDetails.jsx:217`
- `frontend/src/pages/MovieDetails.jsx:342`
- `frontend/src/pages/MovieDetails.jsx:387`
- `frontend/src/pages/MovieDetails.jsx:404`

### Dashboard (`frontend/src/pages/Dashboard.jsx`)

Court intitule: cockpit admin/superadmin (profil, assignations, notes, selections, transitions phase).

Fonctions clefs:
- chargement agrege dashboard + assignments + site phase
- filtres films assignes (search/sort/rating)
- actions assignation (claim/release/auto/rebalance)
- actions notes (modal)
- controle selections phase 2/3 et validations superadmin
- transition phase manuelle securisee

References:
- `frontend/src/pages/Dashboard.jsx:71`
- `frontend/src/pages/Dashboard.jsx:167`
- `frontend/src/pages/Dashboard.jsx:466`
- `frontend/src/pages/Dashboard.jsx:888`
- `frontend/src/pages/Dashboard.jsx:713`
- `frontend/src/pages/Dashboard.jsx:742`
- `frontend/src/pages/Dashboard.jsx:666`

### Upload (`frontend/src/pages/YoutubeUpload.jsx`)

Court intitule: formulaire upload 3 etapes avec validations front strictes + ALTCHA + polling YouTube.

Fonctions clefs:
- validation metadonnees video front
- normalisation poster (crop/compress)
- validation formulaire/cast/social
- progression par etapes 1/2/3
- envoi multipart vers backend upload
- polling statut YouTube

References:
- `frontend/src/pages/YoutubeUpload.jsx:234`
- `frontend/src/pages/YoutubeUpload.jsx:588`
- `frontend/src/pages/YoutubeUpload.jsx:109`
- `frontend/src/pages/YoutubeUpload.jsx:473`
- `frontend/src/pages/YoutubeUpload.jsx:533`
- `frontend/src/pages/YoutubeUpload.jsx:729`
- `frontend/src/pages/YoutubeUpload.jsx:390`

### Autres pages de contenu

- About: `frontend/src/pages/About.jsx:10`
- Partenaires: `frontend/src/pages/Partenaires.jsx:9`
- Jury: `frontend/src/pages/jury.jsx:140`
- Legal (CGV/CGU/mentions): `frontend/src/pages/LegalPage.jsx:122`
- Newsletter: `frontend/src/pages/Newsletter.jsx:8`
- NotFound: `frontend/src/pages/NotFound.jsx:6`
- DashboardEntry (gate session): `frontend/src/pages/DashboardEntry.jsx:13`

## 4.5 Composants transverses

### Navbar/Footer

- nav adaptative FR/EN
- masquage liens selon phase/session
- menu mobile scroll interne + body lock
- switch theme global
- icone profil si session

References:
- `frontend/src/components/Navbar.jsx:18`
- `frontend/src/components/Navbar.jsx:32`
- `frontend/src/components/Navbar.jsx:84`
- `frontend/src/components/Navbar.jsx:41`
- `frontend/src/components/Footer.jsx:8`
- `frontend/src/components/Footer.jsx:81`

### Countdown phase

- calcule cible phase 1/2
- masque complet phase 3
- variant home/callForProject

References:
- `frontend/src/components/phases/PhaseCountdownBanner.jsx:15`
- `frontend/src/components/phases/PhaseCountdownBanner.jsx:60`

### Viewer 3D/fallback image (performance aware)

- heuristique device/network/webgl
- override manuel `localStorage[marsai_home_3d]`
- lazy load script model-viewer
- fallback image robot light/night

References:
- `frontend/src/models/homeModelViewerModel.js:66`
- `frontend/src/controllers/useHomeModelViewerController.js:15`
- `frontend/src/services/modelViewerScriptService.js:56`
- `frontend/src/components/HomeModelViewer.jsx:23`

### Gallery UI blocks

- Hero carousel winners
- cards films
- toolbar recherche
- modal filtres avances
- pagination

References:
- `frontend/src/components/gallery/GalleryHeroCarousel.jsx:12`
- `frontend/src/components/gallery/GalleryMovieCard.jsx:3`
- `frontend/src/components/gallery/GallerySearchToolbar.jsx:3`
- `frontend/src/components/gallery/GalleryFilterModal.jsx:1`
- `frontend/src/components/gallery/GalleryPagination.jsx:1`

### Dashboard UI blocks

- ligne film actionnable
- progress bars KPI

References:
- `frontend/src/components/dashboard/FilmRow.jsx:59`
- `frontend/src/components/dashboard/ProgressBar.jsx:1`

### Social icons SVG

- normalise reseau (`twitter -> x`, `site/web/url -> website`)
- icones inline SVG pour footer + details film

References:
- `frontend/src/components/ui/SocialIcon.jsx:1`
- `frontend/src/components/ui/SocialIcon.jsx:12`

---

## 5) Donnees metier et schema SQL (couche models)

Tables metier principales (d'apres models + dump SQL):
- `movies`
- `users`
- `movie_cast`
- `movie_admin_ratings`
- `movie_review_assignments`
- `phase2_movie_selections`
- `phase3_winner_selections`
- `site_phase_state`
- `admin_capacity_profiles`
- `admin_logs`

References:
- `backend/models/movieModel.js:1`
- `backend/models/ratingModel.js:3`
- `backend/models/assignmentModel.js:3`
- `backend/models/sitePhaseModel.js:142`
- `backend/models/dashboardModel.js:3`

Points schema importants:
- index/uniques sur URLs media dans `movies`
- quota selection via logique service (et trigger SQL historique present dans dump)
- FK avec cascades sur sous-objets films

References:
- `backend/models/sitePhaseModel.js:253`
- `backend/models/sitePhaseModel.js:429`

---

## 6) S3 / media lifecycle

## 6.1 Ecriture media

- upload video/poster/subtitle sur objet storage
- URL publique en base
- suppression fichiers temporaires locaux

References:
- `backend/controllers/uploadController.js:245`
- `backend/controllers/uploadController.js:258`
- `backend/controllers/uploadController.js:269`
- `backend/controllers/uploadController.js:380`

## 6.2 Lecture media

- gallery/detail lisent URLs DB
- details film: lecture directe mp4 pour preview/player phase 1
- download passe par endpoint backend (stream S3)

References:
- `backend/services/movieService.js:127`
- `frontend/src/pages/MovieDetails.jsx:126`
- `backend/controllers/movie.js:296`

## 6.3 Suppression media

- suppression objets lies aux films prunes phase 2
- sweep orphelins videos/posters

References:
- `backend/services/sitePhaseService.js:149`
- `backend/services/sitePhaseService.js:200`
- `backend/services/sitePhaseService.js:676`

## 6.4 Configuration env S3

Variables attendues:
- `SCALEWAY_ACCESS_KEY`
- `SCALEWAY_SECRET_KEY`
- `SCALEWAY_ENDPOINT`
- `SCALEWAY_BUCKET_NAME`
- `SCALEWAY_REGION`
- `SCALEWAY_FOLDER`

References:
- `backend/.env.example`
- `backend/services/objectStorageService.js:73`

---

## 7) Scripts operations (backend/scripts)

### `migrateLocalMediaToS3.js`

But:
- migrer les URLs local `/uploads` vers S3
- mettre a jour DB
- mode `--dry-run` et `--limit`

References:
- `backend/scripts/migrateLocalMediaToS3.js:12`
- `backend/scripts/migrateLocalMediaToS3.js:88`
- `backend/scripts/migrateLocalMediaToS3.js:120`

### `pruneOrphanS3Media.js`

But:
- lister objets S3 `videos/` + `posters/`
- comparer aux URLs referencees en DB
- supprimer orphelins (`--dry-run` possible)

References:
- `backend/scripts/pruneOrphanS3Media.js:9`
- `backend/scripts/pruneOrphanS3Media.js:15`
- `backend/scripts/pruneOrphanS3Media.js:53`

### `seedS3MoviesFromExisting.js`

But:
- dupliquer des films DB depuis sources deja S3
- utile pour tests massifs galerie/selection
- options `--count`, `--source-limit`, `--submitted-by`, `--cleanup`

References:
- `backend/scripts/seedS3MoviesFromExisting.js:24`
- `backend/scripts/seedS3MoviesFromExisting.js:37`
- `backend/scripts/seedS3MoviesFromExisting.js:173`

### `seedTestMovies.js`

But:
- seed films de test generiques (hors contrainte S3 stricte)
- options `--count`, `--prefix`, `--submitted-by`, `--cleanup`

References:
- `backend/scripts/seedTestMovies.js:20`
- `backend/scripts/seedTestMovies.js:32`

---

## 8) Tests unitaires/integration legere

## 8.1 Couverture presente (frontend)

- hook phase access
- model heuristique 3D
- validation formulaire
- validation video
- countdown timer (double emplacement)
- dashboard rendu + interactions de base
- hook multi phase countdown

References:
- `frontend/src/controllers/__tests__/usePhaseAccessController.test.jsx:11`
- `frontend/src/models/__tests__/homeModelViewerModel.test.js:11`
- `frontend/src/utils/__tests__/formvalidation.test.js:10`
- `frontend/src/utils/__tests__/videoValidation.test.js:4`
- `frontend/src/__tests__/Dashboard.test.jsx:142`
- `frontend/src/__tests__/useMultiPhaseCountdown.test.js:14`
- `frontend/src/__tests__/CountdownTimer.test.jsx:20`
- `frontend/src/components/__tests__/CountdownTimer.test.jsx:15`

## 8.2 Commandes tests/build

Frontend:
- `npm --prefix frontend run test:run`
- `npm --prefix frontend run coverage`
- `npm --prefix frontend run build`

Backend:
- pas de suite de test formalisee (script `test` placeholder)

References:
- `frontend/package.json`
- `backend/package.json`

---

## 9) Checklist pre-deploiement

1. Config env backend complete (`DB_*`, `WP_*`, `SESSION_*`, `SCALEWAY_*`, mail).
2. Verifier acces bucket public (ou strategie download signee si prive).
3. Lancer build frontend.
4. Tester parcours critiques:
   - login WP
   - upload complet
   - gallery phase gates
   - validation phase2/phase3
   - download film session
5. Executer nettoyage orphelins S3 avant mise en prod stable.

References:
- `backend/services/authService.js:426`
- `backend/controllers/uploadController.js:158`
- `backend/services/sitePhaseService.js:544`
- `backend/controllers/movie.js:247`
- `backend/scripts/pruneOrphanS3Media.js:42`

---

## 10) Audit qualite - constats techniques

## 10.1 Points forts

- logique phases tres encadree (dates + quotas + validation superadmin)
- filtrage S3 cote service (evite melange local/S3)
- fallback API frontend robuste (prefixes deploiement/local)
- decoupage service/controller/model globalement propre

References:
- `backend/services/sitePhaseService.js:544`
- `backend/services/movieService.js:330`
- `frontend/src/api.js:87`

## 10.2 Points a surveiller

- duplication tests countdown (`src/__tests__` et `src/components/__tests__`)
- fichier legacy `Header.old.jsx` present
- dependances frontend root + frontend package pouvant diverger
- backend sans tests automatises natifs

References:
- `frontend/src/__tests__/CountdownTimer.test.jsx:20`
- `frontend/src/components/__tests__/CountdownTimer.test.jsx:15`
- `frontend/src/components/Header.old.jsx:16`
- `package.json`
- `frontend/package.json`

## 10.3 Recommandations prioritaires

1. Ajouter tests backend (sitePhaseService, uploadController, movie download).
2. Supprimer/archiver fichiers legacy inutilises (`Header.old.jsx` et eventuels assets morts).
3. Ajouter CI pipeline: lint + tests + build.
4. Ajouter monitoring erreurs production (API + upload + S3).

---

## 11) Annexes (inventaire complet)

### 11.1 Index routes backend (`backend/routes/*`)

```txt
backend/routes\movie.js:6:router.get("/", getAllMovies);
backend/routes\movie.js:7:router.get("/:id/download", downloadMovieById);
backend/routes\movie.js:8:router.get("/:id", getMovieById);
backend/routes\newsletter.js:5:router.post("/subscribe", newsletterController.subscribe);
backend/routes\dashboard.js:6:router.get("/", getDashboard);
backend/routes\mail.js:5:router.post("/send-email", mailController.sendContactEmail);
backend/routes\assignments.js:15:router.post("/auto-assign", autoAssign);
backend/routes\assignments.js:16:router.post("/rebalance", rebalance);
backend/routes\assignments.js:17:router.post("/claim", claim);
backend/routes\assignments.js:18:router.post("/release", release);
backend/routes\assignments.js:19:router.post("/status", status);
backend/routes\assignments.js:20:router.patch("/capacity/:adminId", patchCapacity);
backend/routes\assignments.js:21:router.get("/my", my);
backend/routes\assignments.js:22:router.get("/workload", workload);
backend/routes\public.js:6:router.post("/send-email", sendEmail);
backend/routes\public.js:7:router.post("/subscribe-newsletter", subscribeNewsletter);
backend/routes\public.js:8:router.post("/newsletter/subscribe", subscribeNewsletter);
backend/routes\auth.js:12:router.post("/wordpress/login", wordpressLogin);
backend/routes\auth.js:13:router.patch("/me/profile", requireAuth, updateMeProfile);
backend/routes\auth.js:14:router.get("/me", getMe);
backend/routes\auth.js:15:router.post("/logout", logout);
backend/routes\ratings.js:10:router.get("/:movieId/me", getMyRating);
backend/routes\ratings.js:11:router.patch("/:movieId/me", patchMyRating);
backend/routes\ratings.js:12:router.post("/:movieId/me/delete", deleteMyRating);
backend/routes\altcha.js:22:router.get('/challenge', challengeLimiter, getAltchaChallenge);
backend/routes\sitePhase.js:17:router.get("/", getSitePhase);
backend/routes\sitePhase.js:18:router.get("/phase3-winners", getPhase3Winners);
backend/routes\sitePhase.js:19:router.get("/phase2-selection", requireAuth, requireRole(["admin", "superadmin"]), getPhase2Selection);
backend/routes\sitePhase.js:20:router.patch("/phase2-selection", requireAuth, requireRole(["admin", "superadmin"]), patchPhase2Selection);
backend/routes\sitePhase.js:21:router.post(
backend/routes\sitePhase.js:27:router.get("/phase3-selection", requireAuth, requireRole(["admin", "superadmin"]), getPhase3Selection);
backend/routes\sitePhase.js:28:router.patch("/phase3-selection", requireAuth, requireRole(["admin", "superadmin"]), patchPhase3Selection);
backend/routes\sitePhase.js:29:router.post(
backend/routes\sitePhase.js:35:router.patch("/", requireAuth, requireRole(["admin", "superadmin"]), patchSitePhase);
backend/routes\upload.js:96:router.get("/youtube/status/:id", getYoutubeUploadStatus);
backend/routes\upload.js:97:router.get("/countries", getUploadCountries);
backend/routes\upload.js:99:router.post(
```

### 11.2 Index exports backend (controllers/services/models/utils)

```txt
backend/utils\FileTypeValidator.js:16:export async function  verifyVideoMagicBytes(filePath) {
backend/utils\FileTypeValidator.js:54:export async function verifyImageMagicBytes(filePath) {
backend/utils\FileTypeValidator.js:93:export const validateFileMagicBytes = async (req, res, next) => {
backend/utils\EmailValidator.js:7:export function isDisposableEmail(email){
backend/utils\EmailValidator.js:24:export const validateEmail = (req, res, next) =>{
backend/utils\YT-client.js:13:export default oauth2Client;
backend/utils\VideoAnalyser.js:23:export function analyzeVideo(filePath, timeout = 10_000) {
backend/utils\VideoValidator.js:3:export const VIDEO_CONSTRAINTS = {
backend/utils\VideoValidator.js:24:export function validateVideoData(data) {
backend/models\assignmentModel.js:3:export async function ensureAssignmentSchema(pool, policy) {
backend/models\assignmentModel.js:65:export async function fetchAdminsWithCapacity(pool, policy) {
backend/models\assignmentModel.js:86:export async function fetchMoviesBasic(pool) {
backend/models\assignmentModel.js:98:export async function fetchAssignmentsBasic(pool) {
backend/models\assignmentModel.js:109:export async function fetchRatingsBasic(pool) {
backend/models\assignmentModel.js:120:export async function fetchRatedReviewerCountRows(pool) {
backend/models\assignmentModel.js:132:export async function fetchMyRatedMovieRows(pool, adminId) {
backend/models\assignmentModel.js:145:export async function insertAssignmentsBatch(pool, inserts) {
backend/models\assignmentModel.js:187:export async function moveAssignmentsBatch(pool, moves, actorAdminId) {
backend/models\assignmentModel.js:224:export async function findMovieForUpdate(connection, movieId) {
backend/models\assignmentModel.js:232:export async function findExistingAssignmentForUpdate(connection, movieId, adminId) {
backend/models\assignmentModel.js:240:export async function findAdminRatingForUpdate(connection, movieId, adminId) {
backend/models\assignmentModel.js:248:export async function countMovieReviewersForUpdate(connection, movieId, countedStatusesSql) {
backend/models\assignmentModel.js:262:export async function countMovieRatedReviewersForUpdate(connection, movieId) {
backend/models\assignmentModel.js:276:export async function ensureCapacityProfileForAdmin(connection, adminId, policy) {
backend/models\assignmentModel.js:288:export async function fetchCapacityProfileForUpdate(connection, adminId) {
backend/models\assignmentModel.js:297:export async function fetchManualPendingMinutesForUpdate(connection, adminId, pendingStatusesSql) {
backend/models\assignmentModel.js:314:export async function insertManualAssignment(connection, movieId, adminId) {
backend/models\assignmentModel.js:331:export async function findAssignmentForReleaseForUpdate(connection, movieId, adminId) {
backend/models\assignmentModel.js:346:export async function countRemainingReviewersForRelease(connection, movieId, assignmentId, countedStatusesSql) {
backend/models\assignmentModel.js:362:export async function deleteAssignmentById(connection, assignmentId) {
backend/models\assignmentModel.js:366:export async function updateAssignmentStatus(pool, setSql, params) {
backend/models\assignmentModel.js:379:export async function findAdminUserById(pool, adminId) {
backend/models\assignmentModel.js:388:export async function upsertAdminCapacityProfile(pool, { adminId, capacityMinutes, manualRatio, isActive }) {
backend/models\assignmentModel.js:403:export async function fetchMyAssignmentsRows(pool, adminId) {
backend/models\assignmentModel.js:416:export async function fetchReviewerCountRows(pool, countedStatusesSql) {
backend/models\assignmentModel.js:429:export async function fetchMyPendingMinutes(pool, adminId, pendingStatusesSql) {
backend/models\assignmentModel.js:444:export async function fetchWorkloadRows(pool, { all, currentAdminId, policy, pendingStatusesSql }) {
backend/models\movieModel.js:1:export async function findAllMovies(pool) {
backend/models\movieModel.js:29:export async function findMovieById(pool, movieId) {
backend/models\movieModel.js:59:export async function findCastByMovieId(pool, movieId) {
backend/models\movieModel.js:79:export async function findCastByMovieIds(pool, movieIds) {
backend/utils\MetadataCleaner.js:8:export function cleanMetadata(filePath, timeout = 30_000) {
backend/utils\MetadataCleaner.js:76:export const cleanMetadataMiddleware = async (req, res, next) => {
backend/controllers\assignmentController.js:27:export async function autoAssign(req, res) {
backend/controllers\assignmentController.js:48:export async function rebalance(req, res) {
backend/controllers\assignmentController.js:69:export async function claim(req, res) {
backend/controllers\assignmentController.js:93:export async function release(req, res) {
backend/controllers\assignmentController.js:117:export async function status(req, res) {
backend/controllers\assignmentController.js:150:export async function patchCapacity(req, res) {
backend/controllers\assignmentController.js:181:export async function my(req, res) {
backend/controllers\assignmentController.js:200:export async function workload(req, res) {
backend/models\uploadSubmissionModel.js:5:export async function findCountryIdByAlpha2(alpha2) {
backend/models\uploadSubmissionModel.js:18:export async function createMovieRecord({
backend/models\uploadSubmissionModel.js:65:export async function createMovieCastEntries(movieId, castEntries) {
backend/controllers\altchaController.js:9:export async function getAltchaChallenge(req, res) {
backend/utils\FormValidator.js:5:export const FORM_CONSTRAINTS = {
backend/utils\FormValidator.js:64:export const sanitizeString = (str) => {
backend/utils\FormValidator.js:81:export const containsEmoji = (str) => {
backend/utils\FormValidator.js:87:export const validateField = (fieldName, value) => {
backend/utils\FormValidator.js:135:export const validateFormData = (req, res, next) => {
backend/models\dashboardModel.js:3:export async function ensureDashboardSchema(pool) {
backend/models\dashboardModel.js:7:export async function fetchAdminUsers(pool) {
backend/models\dashboardModel.js:14:export async function fetchDashboardMovies(pool, adminId) {
backend/models\dashboardModel.js:62:export async function fetchNotedCount(pool, adminId) {
backend/models\dashboardModel.js:70:export async function fetchSelectionCount(pool) {
backend/models\dashboardModel.js:75:export async function fetchMoviesTotal(pool) {
backend/models\dashboardModel.js:80:export async function fetchAdminLogs(pool) {
backend/models\dashboardModel.js:100:export async function fetchNewsletterCount(pool) {
backend/controllers\movie.js:160:export async function getAllMovies(req, res) {
backend/controllers\movie.js:215:export async function getMovieById(req, res) {
backend/controllers\movie.js:247:export async function downloadMovieById(req, res) {
backend/models\ratingModel.js:3:export async function ensureRatingSchema(pool) {
backend/models\ratingModel.js:68:export async function findMovieById(pool, movieId) {
backend/models\ratingModel.js:73:export async function findMovieByIdForUpdate(connection, movieId) {
backend/models\ratingModel.js:81:export async function findAdminRatingByMovie(pool, movieId, adminId) {
backend/models\ratingModel.js:95:export async function findMovieRatingsSummary(pool, movieId) {
backend/models\ratingModel.js:108:export async function upsertAdminRating(connection, { movieId, adminId, score, comment }) {
backend/models\ratingModel.js:122:export async function deleteAdminRating(pool, movieId, adminId) {
backend/services\messagingService.js:158:export async function validateEmailAddress(email) {
backend/services\messagingService.js:169:export async function sendContactMail({ name, email, subject, message }) {
backend/services\messagingService.js:195:export async function sendUploadSuccessMail({
backend/services\messagingService.js:275:export async function createOrUpdateBrevoContact({ firstName, email, safePreferences }) {
backend/services\messagingService.js:292:export async function sendNewsletterWelcomeMail({ firstName, email, safePreferences }) {
backend/utils\AltchaValidator.js:18:export const generateChallenge = async () => {
backend/utils\AltchaValidator.js:38:export const verifyAltchaSolution = async (payload) => {
backend/utils\AltchaValidator.js:70:export const validateAltchaMiddleware = async (req, res, next) => {
backend/services\youtubeStatusService.js:4:export function mapYoutubeStatus(item) {
backend/services\youtubeStatusService.js:15:export async function fetchYoutubeStatus(videoId) {
backend/services\dashboardService.js:168:export async function getDashboardPayload({ authUserId, authRole, queryAdminId }) {
backend/services\countryService.js:18:export function mapCountriesForUpload(rows) {
backend/controllers\dashboardController.js:3:export async function getDashboard(req, res) {
backend/services\movieService.js:325:export function toMovieId(rawValue) {
backend/services\movieService.js:330:export async function listMovies() {
backend/services\movieService.js:346:export async function getMovieDetails({ movieId }) {
backend/services\objectStorageService.js:184:export function isObjectStorageConfigured() {
backend/services\objectStorageService.js:188:export function getObjectStorageMissingEnv() {
backend/services\objectStorageService.js:192:export function getObjectStorageSummary() {
backend/services\objectStorageService.js:203:export function isPublicObjectStorageUrl(value) {
backend/services\objectStorageService.js:223:export function extractObjectKeyFromPublicUrl(publicUrl) {
backend/services\objectStorageService.js:250:export async function uploadFileToObjectStorage({
backend/services\objectStorageService.js:282:export async function deleteObjectFromPublicUrl(publicUrl) {
backend/services\objectStorageService.js:309:export async function downloadObjectFromPublicUrl(publicUrl) {
backend/services\objectStorageService.js:333:export async function deleteObjectByKey(objectKey) {
backend/services\objectStorageService.js:353:export async function listObjectKeysByPrefix(relativePrefix) {
backend/controllers\authController.js:16:export async function wordpressLogin(req, res) {
backend/controllers\authController.js:121:export async function updateMeProfile(req, res) {
backend/controllers\authController.js:251:export function getMe(req, res) {
backend/controllers\authController.js:271:export function logout(req, res) {
backend/services\ratingService.js:12:export const COMMENT_MAX_LENGTH = 2000;
backend/services\ratingService.js:20:export function toMovieId(rawValue) {
backend/services\ratingService.js:25:export function toAdminId(rawValue) {
backend/services\ratingService.js:30:export function toScore(rawValue) {
backend/services\ratingService.js:37:export function toComment(rawValue) {
backend/services\ratingService.js:51:export async function getMyMovieRating({ adminId, movieId }) {
backend/services\ratingService.js:82:export async function upsertMyMovieRating({ adminId, movieId, score, comment }) {
backend/services\ratingService.js:118:export async function deleteMyMovieRating({ adminId, movieId }) {
backend/services\sitePhaseService.js:94:export async function getSitePhaseState() {
backend/services\sitePhaseService.js:289:export async function getPhase2SelectionStatus() {
backend/services\sitePhaseService.js:308:export async function getPhase3SelectionStatus() {
backend/services\sitePhaseService.js:327:export async function getPhase3WinnersPublic() {
backend/services\sitePhaseService.js:338:export async function togglePhase2Selection({
backend/services\sitePhaseService.js:402:export async function togglePhase3Selection({
backend/services\sitePhaseService.js:470:export async function validatePhase2Selection({ actorAdminId, actorRole }) {
backend/services\sitePhaseService.js:520:export async function validatePhase3Selection({ actorAdminId, actorRole }) {
backend/services\sitePhaseService.js:544:export async function setSitePhaseState({ currentPhase, mode, updatedBy, actorRole }) {
backend/controllers\publicController.js:8:export async function sendEmail(req, res) {
backend/controllers\publicController.js:47:export async function subscribeNewsletter(req, res) {
backend/services\uploadService.js:12:export async function validateUploadedVideo(filePath) {
backend/services\uploadService.js:17:export async function uploadToYoutube({ title, description, filePath }) {
backend/services\uploadService.js:29:export function buildUploadValidationError(validation) {
backend/services\uploadService.js:33:export function buildUploadSuccess(videoId) {
backend/services\uploadService.js:37:export function removeTempFile(filePath) {
backend/controllers\ratingController.js:11:export async function getMyRating(req, res) {
backend/controllers\ratingController.js:38:export async function patchMyRating(req, res) {
backend/controllers\ratingController.js:79:export async function deleteMyRating(req, res) {
backend/models\countryModel.js:5:export async function listCountriesForUpload() {
backend/models\sitePhaseModel.js:10:export const SITE_PHASE_VALUES = ["phase_1", "phase_2", "phase_3"];
backend/models\sitePhaseModel.js:11:export const SITE_PHASE_MODE_VALUES = ["manual", "timer"];
backend/models\sitePhaseModel.js:142:export async function ensureSitePhaseSchema(pool) {
backend/models\sitePhaseModel.js:202:export async function fetchCurrentSitePhase(pool) {
backend/models\sitePhaseModel.js:238:export async function updateCurrentSitePhase(pool, { currentPhase, mode, updatedBy }) {
backend/models\sitePhaseModel.js:253:export async function countPhase2SelectedMovies(pool) {
backend/models\sitePhaseModel.js:267:export async function fetchPhase2SelectedMovies(pool) {
backend/models\sitePhaseModel.js:293:export async function isMovieSelectedForPhase2(pool, movieId) {
backend/models\sitePhaseModel.js:309:export async function isMovieBackedByObjectStorage(pool, movieId) {
backend/models\sitePhaseModel.js:328:export async function insertPhase2MovieSelection(pool, { movieId, selectionCriteria, selectedBy }) {
backend/models\sitePhaseModel.js:339:export async function deletePhase2MovieSelection(pool, movieId) {
backend/models\sitePhaseModel.js:347:export async function fetchMoviesOutsidePhase2Selection(pool) {
backend/models\sitePhaseModel.js:362:export async function pruneMoviesOutsidePhase2Selection(pool) {
backend/models\sitePhaseModel.js:410:export async function setPhase2ReadyFlag(pool, { isReady, readyBy }) {
backend/models\sitePhaseModel.js:429:export async function countPhase3SelectedMovies(pool) {
backend/models\sitePhaseModel.js:443:export async function fetchPhase3SelectedMovies(pool) {
backend/models\sitePhaseModel.js:469:export async function isMovieSelectedForPhase3(pool, movieId) {
backend/models\sitePhaseModel.js:485:export async function insertPhase3MovieSelection(pool, { movieId, selectionCriteria, selectedBy }) {
backend/models\sitePhaseModel.js:496:export async function deletePhase3MovieSelection(pool, movieId) {
backend/models\sitePhaseModel.js:504:export async function setPhase3ReadyFlag(pool, { isReady, readyBy }) {
backend/services\assignmentService.js:61:export function toPositiveInt(value) {
backend/services\assignmentService.js:66:export function getPolicy() {
backend/services\assignmentService.js:82:export function isAllowedStatus(status) {
backend/services\assignmentService.js:491:export async function runAutoAssign({ actorAdminId }) {
backend/services\assignmentService.js:508:export async function runRebalance({ actorAdminId }) {
backend/services\assignmentService.js:532:export async function claimMovie({ adminId, movieId }) {
backend/services\assignmentService.js:617:export async function releaseMovie({ adminId, movieId }) {
backend/services\assignmentService.js:662:export async function setAssignmentStatus({ adminId, movieId, status }) {
backend/services\assignmentService.js:687:export async function setAdminCapacity({ targetAdminId, capacityMinutes, manualRatio, isActive }) {
backend/services\assignmentService.js:711:export async function getMyAssignments({ adminId }) {
backend/services\assignmentService.js:761:export async function getWorkload({ adminId, includeAll }) {
backend/services\assignmentService.js:795:export function normalizeCapacityInput(body = {}) {
backend/middlewares\authMiddleware.js:3:export function requireAuth(req, res, next) {
backend/middlewares\authMiddleware.js:12:export function requireRole(allowedRoles = []) {
backend/utils\HoneypotValidator.js:3:export const validateHoneypot = (req, res, next) => {
backend/middlewares\uploadMiddleware.js:7:export const ipLimiter = rateLimit({
backend/middlewares\uploadMiddleware.js:20:export const emailLimiter = rateLimit({
backend/middlewares\uploadMiddleware.js:30:export function concurrentLimiter(req, res, next) {
backend/middlewares\uploadMiddleware.js:57:export const uploadSingleVideo = upload.single("video");
backend/models\uploadModel.js:1:export const UPLOAD_CONSTRAINTS = {
backend/models\uploadModel.js:6:export function buildYoutubeInsertRequest({ title, description, fileStream }) {
backend/models\uploadModel.js:24:export function buildUploadSuccessPayload(videoId) {
backend/models\uploadModel.js:32:export function buildValidationFailurePayload(validation) {
backend/controllers\sitePhaseController.js:25:export async function getSitePhase(req, res) {
backend/controllers\sitePhaseController.js:39:export async function patchSitePhase(req, res) {
backend/controllers\sitePhaseController.js:59:export async function getPhase2Selection(req, res) {
backend/controllers\sitePhaseController.js:73:export async function patchPhase2Selection(req, res) {
backend/controllers\sitePhaseController.js:95:export async function postValidatePhase2Selection(req, res) {
backend/controllers\sitePhaseController.js:112:export async function getPhase3Selection(req, res) {
backend/controllers\sitePhaseController.js:126:export async function getPhase3Winners(req, res) {
backend/controllers\sitePhaseController.js:140:export async function patchPhase3Selection(req, res) {
backend/controllers\sitePhaseController.js:162:export async function postValidatePhase3Selection(req, res) {
backend/controllers\uploadController.js:158:export async function submitYoutubeUpload(req, res) {
backend/controllers\uploadController.js:388:export async function getYoutubeUploadStatus(req, res) {
backend/controllers\uploadController.js:413:export async function getUploadCountries(req, res) {
```

### 11.3 Index frontend (pages/components/hooks/services)

```txt
frontend/src/App.jsx:18:export default function App() {
frontend/src/App.jsx:36:            <Route path="/" element={<WpPage isHome={true} />} />
frontend/src/App.jsx:37:            <Route path="/accueil" element={<WpPage isHome={true} />} />
frontend/src/App.jsx:38:            <Route path="/home" element={<WpPage isHome={true} />} />
frontend/src/App.jsx:39:            <Route path="/newsletter" element={<Newsletter />} />
frontend/src/App.jsx:40:            <Route path="/a-propos" element={<About />} />
frontend/src/App.jsx:41:            <Route path="/about" element={<About />} />
frontend/src/App.jsx:42:            <Route path="/partenaires" element={<Partenaires />} />
frontend/src/App.jsx:43:            <Route path="/partner" element={<Partenaires />} />
frontend/src/App.jsx:44:            <Route path="/partners" element={<Partenaires />} />
frontend/src/App.jsx:45:            <Route path="/films" element={<Gallery />} />
frontend/src/App.jsx:46:            <Route path="/movies" element={<Gallery />} />
frontend/src/App.jsx:47:            <Route path="/movie/:id" element={<MovieDetails />} />
frontend/src/App.jsx:48:            <Route path="/dashboard" element={<DashboardEntry />} />
frontend/src/App.jsx:49:            <Route path="/testcountdown" element={<TestCountdown />} />
frontend/src/App.jsx:66:            <Route path="/deposer-un-film" element={<YoutubeUpload />} />
frontend/src/App.jsx:67:            <Route path="/submit-a-film" element={<YoutubeUpload />} />
frontend/src/App.jsx:68:            <Route path="/submit-film" element={<YoutubeUpload />} />
frontend/src/App.jsx:69:            <Route path="/concours" element={<YoutubeUpload />} />
frontend/src/App.jsx:70:            <Route path="/:slug" element={<WpPage />} />
frontend/src/App.jsx:71:            <Route path="*" element={<NotFound />} />
frontend/src/services\modelViewerScriptService.js:56:export function ensureModelViewerScript() {
frontend/src/context\ThemeContext.jsx:5:export const ThemeContext = createContext(null);
frontend/src/context\ThemeContext.jsx:13:export function ThemeProvider({ children }) {
frontend/src/context\ThemeContext.jsx:38:export function useTheme() {
frontend/src/utils\formvalidation.js:3:export const FORM_CONSTRAINTS = {
frontend/src/utils\formvalidation.js:73:export const sanitizeInput = (value) => {
frontend/src/utils\formvalidation.js:84:export const containsEmoji = (str) => {
frontend/src/utils\formvalidation.js:90:export const validateField = (fieldName, value) => {
frontend/src/utils\formvalidation.js:178:export const validateForm = (formData) => {
frontend/src/utils\formvalidation.js:369:export const countGraphemes = (str) => {
frontend/src/utils\formvalidation.js:383:export const exceedsMaxLength = (fieldName, value) => {
frontend/src/pages\About.jsx:10:export default function About() {
frontend/src/pages\Appel a projet.jsx:9:export default function CallForProject({ page }) {
frontend/src/components\CookieModal.jsx:5:export default function CookieModal() {
frontend/src/components\CountdownTimer.jsx:202:export default function CountdownTimer(props) {
frontend/src/models\homeModelViewerModel.js:6:export const MOBILE_VIEWPORT_QUERY = "(max-width: 767px)";
frontend/src/models\homeModelViewerModel.js:7:export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
frontend/src/models\homeModelViewerModel.js:8:export const OBSERVER_ROOT_MARGIN = "200px";
frontend/src/models\homeModelViewerModel.js:9:export const IDLE_LOAD_TIMEOUT_MS = 1200;
frontend/src/models\homeModelViewerModel.js:10:export const FALLBACK_LOAD_DELAY_MS = 300;
frontend/src/models\homeModelViewerModel.js:11:export const HOME_3D_OVERRIDE_STORAGE_KEY = "marsai_home_3d";
frontend/src/models\homeModelViewerModel.js:15:export function getModelViewerSources() {
frontend/src/models\homeModelViewerModel.js:22:export function shouldRenderForViewport(only, isSmallViewport) {
frontend/src/models\homeModelViewerModel.js:28:export function shouldAutoRotate({ reduceMotion, isSmallViewport }) {
frontend/src/models\homeModelViewerModel.js:32:export function getInteractionPrompt(isSmallViewport) {
frontend/src/models\homeModelViewerModel.js:55:export function getHome3DOverride() {
frontend/src/models\homeModelViewerModel.js:66:export function shouldEnableHome3D({ reduceMotion, isSmallViewport }) {
frontend/src/components\dashboard\ProgressBar.jsx:1:export default function ProgressBar({ label, value, color }) {
frontend/src/controllers\useHomeModelViewerController.js:15:export default function useHomeModelViewerController({ src, only = "all" }) {
frontend/src/controllers\usePhaseAccessController.js:4:export default function usePhaseAccessController({ refreshKey } = {}) {
frontend/src/components\dashboard\FilmRow.jsx:59:export default function FilmRow({
frontend/src/components\gallery\GalleryFilterModal.jsx:1:export default function GalleryFilterModal({
frontend/src/components\Footer.jsx:8:export default function Footer() {
frontend/src/components\gallery\GalleryMovieCard.jsx:3:export default function GalleryMovieCard({
frontend/src/components\Schema.jsx:4:export const OrganizationSchema = () => {
frontend/src/components\Schema.jsx:35:export const EventSchema = ({
frontend/src/components\Schema.jsx:81:export const WebSiteSchema = () => {
frontend/src/components\Schema.jsx:106:export const BreadcrumbSchema = ({ items = [] }) => {
frontend/src/components\Schema.jsx:125:export const ArticleSchema = ({
frontend/src/components\Schema.jsx:166:export const MovieSchema = ({
frontend/src/components\gallery\GalleryPagination.jsx:1:export default function GalleryPagination({
frontend/src/components\gallery\GalleryHeroCarousel.jsx:12:export default function GalleryHeroCarousel({
frontend/src/utils\videoValidation.js:1:export const VIDEO_CONSTRAINTS = {
frontend/src/utils\videoValidation.js:16:export const getVideoMetadata = (file) => {
frontend/src/utils\videoValidation.js:42:export const validateVideoFrontend = (data) => {
frontend/src/components\Header.old.jsx:16:export default function Header() {
frontend/src/components\HomeModelViewer.jsx:23:export default function HomeModelViewer({
frontend/src/pages\DashboardEntry.jsx:13:export default function DashboardEntry() {
frontend/src/pages\Home.jsx:11:export default function Home({ page }) {
frontend/src/pages\jury.jsx:140:export default function JuryWpage({ page }) {
frontend/src/components\MoviesData.jsx:1:export const allMovies = [
frontend/src/components\gallery\GallerySearchToolbar.jsx:3:export default function GallerySearchToolbar({
frontend/src/pages\Dashboard.jsx:71:export default function Dashboard() {
frontend/src/pages\LegalPage.jsx:122:export default function LegalPage({ page, variant = "cgv" }) {
frontend/src/components\ui\PageLoader.jsx:3:export default function PageLoader({
frontend/src/components\Seo.jsx:15:export default function Seo({
frontend/src/components\Navbar.jsx:18:export default function Navbar() {
frontend/src/components\phases\PhaseCountdownBanner.jsx:60:export default function PhaseCountdownBanner({
frontend/src/components\ui\SocialIcon.jsx:12:export default function SocialIcon({ network, className = "h-4 w-4" }) {
frontend/src/pages\Newsletter.jsx:8:export default function Newsletter() {
frontend/src/pages\NotFound.jsx:6:export default function NotFound() {
frontend/src/pages\Partenaires.jsx:9:export default function Partenaires() {
frontend/src/pages\WpPage.jsx:171:export default function WpPage({ isHome = false, fixedSlug = null }) {
frontend/src/pages\YoutubeUpload.jsx:234:export default function YoutubeUpload() {
```

---

Fin de l'audit technique.
