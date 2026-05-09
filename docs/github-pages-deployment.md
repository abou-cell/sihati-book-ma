# Déploiement GitHub Pages de Sihati

Sihati supporte deux modes de build Next.js selon la cible de déploiement.

## Mode Docker / AWS / serveur Node.js

Le mode normal utilise `output: "standalone"`. Il produit une application Next.js autonome qui s'exécute avec un serveur Node.js. C'est le mode à utiliser pour le vrai backend de production, par exemple Docker ou AWS.

Dans ce mode, l'application peut utiliser les fonctionnalités serveur de Next.js :

- routes API sous `/api/*` ;
- rendu serveur dynamique ;
- accès aux cookies et headers de requête ;
- logique d'authentification serveur ;
- accès aux services backend et à la base de données ;
- security headers configurés dans `next.config.ts`.

## Mode GitHub Pages

Le mode GitHub Pages utilise `output: "export"`. GitHub Pages héberge uniquement des fichiers statiques : HTML, CSS, JavaScript et assets. Il n'exécute pas de serveur Next.js.

Quand la variable d'environnement `GITHUB_PAGES` vaut `"true"`, la configuration applique :

- `output: "export"` pour générer le dossier statique `out/` ;
- `basePath: "/sihati"` pour servir l'application sous `https://abou-cell.github.io/sihati/` ;
- `assetPrefix: "/sihati/"` pour préfixer les assets CSS, JS et images ;
- `images.unoptimized: true`, requis car l'optimisation d'images Next.js nécessite un serveur ;
- `trailingSlash: true`, pratique pour l'hébergement statique ;
- aucun `async headers()`, car GitHub Pages ne lit pas les headers serveur Next.js.

Ce mode sert uniquement à prévisualiser les interfaces frontend. Pendant ce build, le script `npm run build` met temporairement de côté les routes API `app/api/*`, car elles ne sont pas exportables en HTML statique et GitHub Pages ne peut pas les exécuter. Les fichiers sont restaurés automatiquement après le build.

## Lancer un build GitHub Pages localement

Depuis la racine du repository :

```bash
npm install
GITHUB_PAGES=true npm run build
```

Après le build, vérifier que le dossier suivant existe :

```text
out/
```

Le workflow GitHub Actions publie exactement ce dossier avec `actions/upload-pages-artifact`.

## Vérifier le déploiement GitHub Actions

1. Pousser les changements sur la branche `main`.
2. Ouvrir l'onglet **Actions** du repository GitHub.
3. Sélectionner le workflow **Deploy Sihati to GitHub Pages**.
4. Vérifier que les jobs **build** puis **deploy** passent au vert.
5. Ouvrir l'URL publiée : <https://abou-cell.github.io/sihati/>.

## Configuration manuelle dans GitHub

Dans **Settings > Pages** du repository :

1. Choisir **Build and deployment**.
2. Sélectionner **Source: GitHub Actions**.
3. Sauvegarder si nécessaire.
4. Relancer le workflow ou pousser un commit sur `main`.

## Limites du mode GitHub Pages

GitHub Pages ne fournit pas de backend. Les fonctionnalités suivantes ne fonctionnent pas en statique :

- routes API `/api/*` ;
- Server Actions ;
- serveur Next.js ;
- SSR dynamique dépendant d'une requête ;
- accès direct à une base de données ;
- authentification serveur complète ;
- webhooks, paiements réels, uploads serveur et tâches backend.

Pour la prévisualisation GitHub Pages, les appels backend doivent être désactivés, mockés ou remplacés par une logique frontend. Dans l'état actuel, la recherche praticien utilise des données statiques en mode GitHub Pages, la création de rendez-vous affiche une confirmation mockée, et l'écran de configuration des services signale que ses APIs sont indisponibles. Le déploiement complet avec backend doit rester sur Docker / AWS / serveur Node.js.
