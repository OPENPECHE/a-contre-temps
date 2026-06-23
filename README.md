# à contre-temps — Mode d'emploi de branchement

## 1. Hébergement du site
Le fichier `a-contre-temps.jsx` est le composant React du site. Pour le
mettre en ligne, il doit être intégré à un projet React standard (Vite,
Next.js, Create React App...) puis déployé chez un hébergeur
(Vercel, Netlify, OVH...). C'est l'étape où ton développeur (ou toi) connecte
le nom de domaine.

## 2. Liens de paiement Revolut
Dans `a-contre-temps.jsx`, cherche le bloc `PAYMENT_LINKS` (vers la ligne 140).
Pour chaque produit :
1. Crée le Payment Link correspondant dans Revolut Business
   (Merchant > Payment links), avec le bon montant.
2. Colle l'URL générée dans le champ vide correspondant à l'id du produit.

Exemple :
```js
const PAYMENT_LINKS = {
  m1: "https://revolut.me/votrecompte/xxxxx", // Box petit-déjeuner — par personne
  ...
};
```

Tant qu'un lien est vide, le client passe automatiquement par le formulaire
de contact (commande manuelle confirmée par toi). Dès qu'un lien est rempli,
le bouton "Payer en ligne avec Revolut" apparaît dans le panier — mais
uniquement quand le client a choisi un seul produit en quantité 1 (un lien
Revolut a un montant fixe, il ne peut pas s'adapter automatiquement à un
panier mixte). Pour les commandes combinées, le total est confirmé avec toi
avant paiement.

## 3. Installer le site comme une application (PWA)
Trois fichiers sont fournis : `manifest.json`, et les icônes dans le
dossier `icons/`.
1. Place `manifest.json` à la racine du site (à côté de `index.html`).
2. Crée un dossier `/icons` à la racine et place-y les 4 fichiers icône.
3. Dans le `<head>` de `index.html`, ajoute :
   ```html
   <link rel="manifest" href="/manifest.json">
   <meta name="theme-color" content="#3E5A70">
   ```
4. Une fois le site en ligne (HTTPS obligatoire), un visiteur sur mobile
   pourra faire "Ajouter à l'écran d'accueil" — l'icône cœur apparaîtra
   comme une vraie application.

## 4. Formulaire de contact
Le bouton "Envoyer" du formulaire est pour l'instant une démonstration
visuelle (il affiche une confirmation mais n'envoie rien). Il faudra le
relier à un service d'envoi d'email (ex. Resend, Formspree, ou une fonction
serveur) pour qu'il t'achemine réellement les demandes.
