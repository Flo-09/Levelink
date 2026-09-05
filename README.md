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
- Écran d’entrée avec choix direct de l’univers, navigation latérale sur ordinateur et barre tactile compacte sur mobile
- Intro Legendary : croisement des épées originales, anneaux, onde d’impact et sélection d’univers au clavier
- Retours de quête, particules d’XP, transitions des pages et apparitions progressives des panneaux
- Célébrations de rang, boss et journée parfaite coordonnées pour éviter leur superposition
- Animations adaptatives, mode léger et désactivation dans les paramètres ; respect de la réduction des animations du système
- Relecture de l’intro depuis les paramètres, sans réinitialiser la progression
- Tutoriel contextuel v3 adapté au clavier mobile et aux grands écrans

## Design Legendary v17

`legendary.css` porte les nouveaux styles et `legendary-motion.js` gère uniquement les effets de présentation. Les règles du jeu et les données restent dans `index.html`. Conservez ces trois fichiers ensemble lors de la publication.

L’intro apparaît une fois par session, y compris pour les personnes ayant déjà vu la v16. Un joueur existant peut reprendre directement ses quêtes. Sa relecture est bloquée pendant un chrono actif afin de préserver la session.

Les effets temporaires sont limités et nettoyés. Les particules s’arrêtent lorsque l’onglet est masqué ; les récompenses restent annoncées lorsque les animations sont désactivées. Les compteurs et la barre d’XP tiennent compte des récompenses successives et des annulations.

## Vérification

Les tests utilisent uniquement Node.js, sans installation de dépendances :

```bash
node --test tests/legendary.test.cjs
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
