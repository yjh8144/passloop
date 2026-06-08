# PassLoop

[中文](../README.md) | [English](README.en.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

Plateforme locale et légère de quiz. Supporte l'import/export de questions, plusieurs modes de pratique, l'analyse assistée par LLM, la gestion des erreurs et les statistiques. Toutes les données sont stockées dans le localStorage du navigateur — aucun backend nécessaire, prêt à l'emploi.

## Captures d'écran

![Banque de questions](screenshot-home.png)

![Mode pratique](screenshot-practice.png)

## Fonctionnalités

### Pratique

- **Mode pratique** : Répondre une par une, voir les résultats et explications après soumission
- **Mode mémorisation** : Affiche directement les réponses et explications pour la révision
- **Une seule / Examen** : Parcourir une par une ou soumettre toutes les réponses d'un coup
- **Révélation des réponses** : Révélation immédiate ou après complétion
- **Auto-suivant après réponse** : Rythme de pratique rapide optionnel
- **Recherche et filtre** : Localisation rapide par titre, contenu ou type
- **Grille de navigation** : Panneau visuel avec statut coloré des réponses
- **Résumé de complétion** : Affiche la précision et le temps après avoir terminé

### Types de questions

- Choix unique, choix multiple, vrai/faux, texte à trous, réponse courte

### Gestion de la banque de questions

- Ajout, modification et suppression manuels de questions
- Import/export JSON (fichier local ou import par URL avec animation de chargement)
- Création, modification et suppression de listes
- Sauvegarde et restauration complètes (mode fusion ou écrasement)
- Panneau d'édition flottant, pratique sur petits écrans

### Assistance LLM

- Connexion à OpenAI / Anthropic / Gemini ou toute API compatible
- Support proxy CORS pour résoudre les problèmes cross-origin
- Coller ou télécharger du texte non formaté, conversion en un clic en JSON quiz standard
- Remplissage automatique des réponses et explications (avec aperçu en streaming)
- Test de connexion et récupération de la liste des modèles
- Mode auto-remplissage : coller manuellement le JSON généré par une IA externe et valider l'import

### Gestion des erreurs

- Collecte automatique des réponses incorrectes
- Créer ou exporter une liste d'erreurs pendant la pratique pour une révision ciblée
- Chronomètre de session et statistiques en temps réel

### Statistiques

- Taux de précision, temps moyen
- Suivi de la progression des soumissions
- Statistiques par question
- Compteur d'erreurs

### Personnalisation et responsive

- 7 thèmes : Mint, Paper, Lavender, Ocean, Rose, Night, Nord
- 5 langues : chinois, English, 日本語, 한국어, Français
- Mise en page responsive (bureau et mobile)
- Barre de navigation mobile inférieure et panneau flottant
- Barre latérale repliable

## Stack technique

| Catégorie | Technologie |
|-----------|-------------|
| Framework | React 18 |
| Langage | TypeScript |
| Build | Vite 7 |
| Icônes | Lucide React |
| Stockage | localStorage |
| Déploiement | Fichiers statiques purs, tout serveur web |

## Démarrage rapide

### Utilisation directe (sans installation)

Téléchargez `passloop.html` depuis les [Releases](https://github.com/yjh8144/passloop/releases) et ouvrez-le dans votre navigateur. Toutes les fonctionnalités sont intégrées dans ce fichier unique.

### Développement local

Prérequis : Node.js >= 18, npm >= 9

```bash
# Cloner le projet
git clone https://github.com/yjh8144/passloop.git
cd passloop

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

Le serveur de développement écoute par défaut sur `http://localhost:5173` avec accès LAN activé.

### Lint et formatage

```bash
npm run lint      # Vérification ESLint
npm run format    # Formatage Prettier
```

### Build de production

```bash
npm run build          # Build standard, sortie dans dist/
npm run build:single   # Build fichier unique, sortie dist-single/index.html
```

La sortie est dans `dist/`. La version fichier unique est dans `dist-single/index.html` et peut être ouverte directement dans un navigateur.

### Aperçu de production

```bash
npm run preview
```

## Déploiement

PassLoop compile en fichiers statiques purs (HTML + CSS + JS) et peut être déployé sur tout service d'hébergement statique (Vercel, Netlify, GitHub Pages, Cloudflare Pages, etc.), ou auto-hébergé avec Nginx ou Docker.

Commande de build : `npm run build`, répertoire de sortie : `dist`.

## Proxy CORS

Les API LLM ont des restrictions cross-origin. Le répertoire `proxy/` fournit deux solutions de proxy :

- **Cloudflare Workers** — Serverless, quota gratuit
- **Node.js** — Déploiement VPS personnel, support Docker

Voir [proxy/README.md](../proxy/README.md) pour les détails.

## Données

Toutes les données utilisateur sont stockées dans le localStorage du navigateur :

| Clé | Contenu |
|-----|---------|
| `passloop.app.v1` | Questions, listes, historique, paramètres |
| `passloop.llm-config.v1` | Configuration API LLM |
| `passloop.debug` | Basculement mode debug |

Vider les données du navigateur supprimera toutes les questions et tous les historiques. Exportez régulièrement vos sauvegardes.

## Licence

MIT
