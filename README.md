# ROTA

Planning de travail posté (3×8, 2×8, journée, temps partiel…) et simulation de paie.
Application web installable (PWA) : <https://loks93.github.io/rota/>

## Installer
- **iPhone** : ouvrir le lien dans Safari → Partager → *Sur l'écran d'accueil*. Toujours lancer ROTA depuis l'icône.
- **Android** : ouvrir dans Chrome → menu ⋮ → *Installer l'application*.

Les données restent sur le téléphone. Pense à utiliser *Exporter une sauvegarde* de temps en temps.

## Module EDF
Les données propres à EDF sont dans `edf.enc.json`, chiffrées (AES-256-GCM, clé PBKDF2-SHA256 à 600 000 itérations).
Elles ne sont lisibles qu'avec le code d'accès. Aucune donnée EDF en clair n'est dans ce dépôt.

## Publier une mise à jour
1. Modifier les fichiers.
2. Incrémenter **`APP_VERSION` dans `sw.js`** et **`ROTA_BUILD` dans `index.html`** (même numéro).
3. Pousser sur `main`. Les utilisateurs voient « Une version plus récente de ROTA est prête » en ~1 min.

## Changer le code EDF
```
node outils/chiffrer-edf.mjs prive/edf-data.json "nouvelle phrase secrète" > edf.enc.json
```
Puis incrémenter la version. `prive/edf-data.json` ne doit jamais être poussé (déjà exclu par `.gitignore`).
