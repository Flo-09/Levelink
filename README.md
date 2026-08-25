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
