# Deploy Plesk - MarsAiFestival

Ce guide prepare un deploiement avec URL publique:

- Frontend: `https://samuel-corinthe.students-laplateforme.io/MarsAiFestival/`
- WordPress (CMS + login): `https://samuel-corinthe.students-laplateforme.io/MarsAi/`
- Backend API: au choix
  - soit via reverse proxy `.../MarsAiFestival/api/*`
  - soit via sous-domaine `https://api...` (avec proxy depuis `/api` ou `/MarsAiFestival/api`)

## 1) Frontend build (local)

Depuis la racine:

```bash
npm --prefix frontend ci
npm --prefix frontend run build
```

Variables frontend pour build production:

```env
VITE_APP_BASE_PATH=/MarsAiFestival/
VITE_API_BASE_PATH=/MarsAiFestival
VITE_WORDPRESS_URL=https://samuel-corinthe.students-laplateforme.io/MarsAi
VITE_WP_LOGIN_URL=https://samuel-corinthe.students-laplateforme.io/MarsAi/wp-login.php
```

Le build sort dans `frontend/dist`.

## 2) Upload frontend sur Plesk

Uploader le contenu de `frontend/dist/` dans:

- `httpdocs/MarsAiFestival/`

Verifier que la config serveur fait fallback vers `index.html` pour les routes SPA.

## 3) Backend Node sur Plesk

Dans Plesk Node.js:

- startup file: `app.js`
- mode: `production`
- `npm install` sur dossier backend
- variables depuis `backend/.env.example`

Points critiques:

- `ALLOWED_ORIGINS=https://samuel-corinthe.students-laplateforme.io`
- `WP_BASE_URL=https://samuel-corinthe.students-laplateforme.io/MarsAi`
- variables DB correctes
- variables S3 correctes

## 4) Proxy Nginx conseille

Sur le domaine principal, router les appels API:

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}

location /MarsAiFestival/api/ {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

Le backend accepte deja:

- `/api/*`
- `/MarsAi/api/*`
- `/MarsAiFestival/api/*`

## 4.b) Option B (si tu ne peux pas editer nginx)

Tu peux appeler l'API via un sous-domaine direct (ex: `https://api...`) sans proxy.

Variables frontend:

```env
VITE_APP_BASE_PATH=/MarsAiFestival/
VITE_API_BASE_PATH=/MarsAiFestival
VITE_API_ORIGIN=https://api.samuel-corinthe.students-laplateforme.io
VITE_WORDPRESS_URL=https://samuel-corinthe.students-laplateforme.io/MarsAi
VITE_WP_LOGIN_URL=https://samuel-corinthe.students-laplateforme.io/MarsAi/wp-login.php
```

Notes:
- `VITE_API_ORIGIN` force les appels vers le sous-domaine API.
- Le backend doit autoriser `ALLOWED_ORIGINS=https://samuel-corinthe.students-laplateforme.io`.
- Rebuild frontend obligatoire apres changement des variables `VITE_*`.

## 5) Checklist de verification

1. `.../MarsAiFestival/` charge bien.
2. Pages React directes (`/films`, `/movie/:id`, `/dashboard`) rechargent sans 404.
3. Login dashboard OK.
4. Upload film OK.
5. Gallery/details OK.
6. Appels phase 2/3 OK.
7. URLs media (S3) lisibles.
