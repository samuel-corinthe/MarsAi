# MarsAI - Note technique (client)

## Architecture (vue rapide)
- Frontend React/Vite: interfaces publiques, dashboard, upload, player video.
- Backend Express: auth, upload, movies, securite, session.
- WordPress: source d identite (comptes + roles) et contenu CMS public.
- MySQL app: users sync, movies, assignations, notes, dashboard.
- YouTube: cible de publication video.

Schema logique: Frontend -> Backend -> (WordPress + MySQL + YouTube)

## Routes front principales
- Dashboard: `/dashboard` -> `DashboardEntry`
Refs: [`frontend/src/App.jsx`](frontend/src/App.jsx) (ligne 46)

- Upload: `/deposer-un-film`, `/submit-a-film`, `/submit-film`, `/concours` -> `YoutubeUpload`
Refs: [`frontend/src/App.jsx`](frontend/src/App.jsx) (lignes 64, 65, 66, 67)

- Detail film: `/movie/:id` -> `MovieDetails`
Refs: [`frontend/src/App.jsx`](frontend/src/App.jsx) (ligne 45)

## Flux 1 - Session dashboard WordPress vers app
1. Le front verifie une session existante.
Refs: [`frontend/src/pages/DashboardEntry.jsx`](frontend/src/pages/DashboardEntry.jsx) (ligne 26), [`frontend/src/api.js`](frontend/src/api.js) (lignes 258, 259)
Fonctions cles: `DashboardEntry`, `getCurrentSessionUser`.

2. Si non connecte, le front envoie le login WordPress.
Refs: [`frontend/src/pages/DashboardEntry.jsx`](frontend/src/pages/DashboardEntry.jsx) (ligne 50), [`frontend/src/api.js`](frontend/src/api.js) (lignes 223, 226)
Fonctions cles: `handleSubmit`, `loginWithWordPress`.

3. Le backend verifie les identifiants WordPress: REST puis fallback `wp-login.php`.
Refs: [`backend/controllers/authController.js`](backend/controllers/authController.js) (lignes 16, 25), [`backend/services/authService.js`](backend/services/authService.js) (lignes 351, 383, 146, 164)
Fonctions cles: `wordpressLogin`, `fetchWordPressIdentity`, `authenticateWpFormSession`, `tryWpLoginFormIdentity`.

4. Mapping role WordPress -> role app.
- `administrator` -> `superadmin`
- `editor` -> `admin`
Refs: [`backend/services/authService.js`](backend/services/authService.js) (ligne 320)
Fonctions cles: `mapWpRolesToAppRole`.

5. Sync utilisateur dans `users` (champs WordPress inclus).
Refs: [`backend/services/authService.js`](backend/services/authService.js) (lignes 649, 710)
Fonctions cles: `upsertLocalUser`, `updateLocalUserFromWpIdentity`, `splitDisplayName`.

6. Creation de la session applicative (cookie JWT `marsai_sid`).
Refs: [`backend/services/authService.js`](backend/services/authService.js) (lignes 6, 786)
Fonctions cles: `buildSessionPayload`, `setSessionCookie`, `getSessionFromRequest`, `verifySessionToken`.

## Flux 2 - Modif dashboard app vers wordpress
1. Le dashboard envoie `PATCH /api/auth/me/profile` avec le mot de passe WordPress.
Refs: [`frontend/src/pages/Dashboard.jsx`](frontend/src/pages/Dashboard.jsx) (lignes 394, 401, 404), [`frontend/src/api.js`](frontend/src/api.js) (lignes 286, 303)
Fonctions cles: `handleProfileSave`, `updateCurrentSessionProfile`.

2. Le backend ouvre une session WordPress serveur.
Refs: [`backend/routes/auth.js`](backend/routes/auth.js) (ligne 13), [`backend/controllers/authController.js`](backend/controllers/authController.js) (lignes 113, 150), [`backend/services/authService.js`](backend/services/authService.js) (ligne 538)
Fonctions cles: `updateMeProfile`, `updateWordPressProfileViaForm`, `authenticateWpFormSession`.

3. Le backend met a jour le profil WordPress via `/wp-admin/profile.php`.
Refs: [`backend/services/authService.js`](backend/services/authService.js) (ligne 613)
Fonctions cles: `updateWordPressProfileViaForm`, `extractInputValue`, `extractTextareaValue`.

4. Le backend resynchronise la table locale `users` et regenere la session.
Refs: [`backend/controllers/authController.js`](backend/controllers/authController.js) (lignes 177, 188), [`backend/services/authService.js`](backend/services/authService.js) (lignes 710, 786)
Fonctions cles: `updateLocalUserFromWpIdentity`, `buildSessionPayload`, `setSessionCookie`.

Conclusion: la source est bien mise a jour cote WordPress, puis alignee cote base locale.

## Flux 3 - Upload video
1. Le front valide le fichier, construit le form-data et envoie `POST /api/upload/youtube`.
Refs: [`frontend/src/pages/YoutubeUpload.jsx`](frontend/src/pages/YoutubeUpload.jsx) (lignes 238, 299, 345, 376)
Fonctions cles: `handleFileChange`, `handleUpload`, `getVideoMetadata`, `validateVideoFrontend`.

2. Le backend applique les controles (origine, anti-abus, type reel, validation form, analyse video).
Refs: [`backend/routes/upload.js`](backend/routes/upload.js) (lignes 346, 396, 397), [`backend/app.js`](backend/app.js) (ligne 74)
Fonctions cles: `verifyOrigin`, `validateHoneypot`, `validateFileMagicBytes`, `validateAltchaMiddleware`, `validateFormData`, `validateEmail`, `analyzeVideo`, `validateVideoData`.

3. Si conforme: upload YouTube, stockage local, insertion DB `movies`.
Refs: [`backend/routes/upload.js`](backend/routes/upload.js) (lignes 414, 442, 444, 480), [`backend/app.js`](backend/app.js) (ligne 62)
Fonctions cles: `google.youtube(...).videos.insert`, `toSlug`, `ensureDirectory`, `sendUploadSuccessMail`.

4. Le front suit le statut de traitement YouTube.
Refs: [`frontend/src/pages/YoutubeUpload.jsx`](frontend/src/pages/YoutubeUpload.jsx) (lignes 190, 214), [`backend/routes/upload.js`](backend/routes/upload.js) (ligne 285)
Fonctions cles: `fetchYoutubeStatus` (front), `startYoutubeStatusPolling`, `fetchYoutubeStatus` (backend), `mapYoutubeStatus`.

## Flux 4 - Lecture video
1. Le front recupere les films via API movies.
Refs: [`frontend/src/api.js`](frontend/src/api.js) (lignes 166, 178), [`backend/routes/movie.js`](backend/routes/movie.js) (lignes 6, 7)
Fonctions cles: `getMovies`, `getMovieById`, `getAllMovies`, `getMovieById` (controller).

2. `MovieDetails` ouvre `MascotCameraPlayer` avec `videoUrl`.
Refs: [`frontend/src/pages/MovieDetails.jsx`](frontend/src/pages/MovieDetails.jsx) (lignes 161, 442, 443), [`frontend/src/components/MascotCameraPlayer.jsx`](frontend/src/components/MascotCameraPlayer.jsx) (lignes 135, 536)
Fonctions cles: `MovieDetails`, `MascotCameraPlayer`, `togglePlay`, `seekBy`, `toggleFullscreen`.

3. Le backend ne publie en lecture que les URLs locales valides.
Refs: [`backend/services/movieService.js`](backend/services/movieService.js) (lignes 123, 252, 283)
Fonctions cles: `isServerHostedVideoUrl`, `mapMovieRow`, `listMovies`, `getMovieDetails`.

## Securite (resume)
- Session JWT en cookie HttpOnly (SameSite Lax, Secure en prod).
Refs: [`backend/services/authService.js`](backend/services/authService.js) (ligne 786)
Fonctions cles: `setSessionCookie`, `clearSessionCookie`, `verifySessionToken`.

- Routes privees protegees par auth + role.
Refs: [`backend/middlewares/authMiddleware.js`](backend/middlewares/authMiddleware.js) (lignes 3, 12), [`backend/app.js`](backend/app.js) (ligne 81)
Fonctions cles: `requireAuth`, `requireRole`, `getSessionFromRequest`.

- Upload protege par controles anti-abus et validation serveur.
Refs: [`backend/routes/upload.js`](backend/routes/upload.js) (ligne 346)
Fonctions cles: `ipLimiter`, `emailLimiter`, `concurrentLimiter`, `validateHoneypot`, `validateFileMagicBytes`, `validateAltchaMiddleware`.

## Endpoints cles
- Auth: `POST /api/auth/wordpress/login`, `GET /api/auth/me`, `PATCH /api/auth/me/profile`, `POST /api/auth/logout`
- Upload: `POST /api/upload/youtube`, `GET /api/upload/youtube/status/:id`, `GET /api/upload/countries`
- Movies: `GET /api/movies`, `GET /api/movies/:id`
