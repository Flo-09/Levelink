# Levelink

Levelink est un prototype d’application web qui transforme la progression personnelle en expérience RPG : les actions deviennent des quêtes, les efforts donnent de l’XP et la régularité fait évoluer le rang du joueur.

## Fonctionnalités principales

- Quêtes quotidiennes, tâches et séries de progression
- Timers avec séries, pauses et mode allégé
- XP, niveaux, rangs et boss de palier
- Statistiques, analyse sur 90 jours, heatmap et palmarès
- Build `STR · INT · WIL · AGI` et bouclier de Volonté
- Deux univers visuels : Solo Levelink (inspiré de Solo Leveling) et Sword Art Online
- Interface responsive avec animations adaptatives
- Directeur de mission adaptatif : recommande la meilleure prochaine action selon les séries, la régularité, la durée et l'heure
- Deux cartes illustrées pour choisir son univers et un accès direct au journal lors des visites suivantes
- Journal de quêtes avec recherche insensible aux accents, filtres et modèles personnalisables
- Progression du joueur, calendrier hebdomadaire et guide interactif à la demande
- Animations adaptatives, mode léger et prise en compte de la réduction des animations du système

## Interface

Le journal place les quêtes et le bouton de création en tête sur mobile. Sur ordinateur, la fiche du joueur et sa semaine occupent la colonne de droite. Les illustrations accompagnent le choix d’univers et le journal. Les polices, icônes et illustrations sont fournies avec l’application.

Pour distribuer le projet, conservez `index.html`, `journal.css`, `legendary.css`, `legendary-motion.js` et le dossier `assets/` ensemble. Le guide et le choix initial des mondes peuvent être rejoués depuis les paramètres.

## Vérification

Les tests utilisent uniquement Node.js, sans installation de dépendances :

```bash
node --test tests/*.test.cjs
```

Ils vérifient la syntaxe, l’entrée et la relecture de l’intro, les commandes clavier, le mode sans animations, les courses entre récompenses, la fermeture des formulaires, la file des célébrations et le nettoyage des effets. Ces tests simulent les événements et l’état ; ils ne vérifient pas le rendu visuel ni la fluidité réelle dans un navigateur.

## Lancer le prototype

Le projet n’a pas besoin de compilation. Ouvrez directement `index.html` dans un navigateur moderne ou servez le dossier avec un serveur statique :

```bash
python -m http.server 8080
```

Puis ouvrez `http://localhost:8080`.

## Stack

- HTML, CSS et JavaScript vanilla
- Canvas 2D pour les effets visuels
- Lucide Icons
- Stockage local du navigateur

## Données

Les quêtes, tâches, historiques et XP sont enregistrés dans `localStorage`. Les univers sont uniquement des thèmes : changer d’univers conserve désormais la même progression.

## Statut

Levelink est actuellement un prototype front-end. Il ne possède pas encore de compte utilisateur, de synchronisation multi-appareils ni de backend.
