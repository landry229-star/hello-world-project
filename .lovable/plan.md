# Boutique e-commerce – Bénin

Une boutique moderne vendant produits physiques **et** numériques, avec paiement Mobile Money (MTN MoMo Bénin, Moov Money), authentification clients et back-office admin.

## Stack & intégrations
- **Lovable Cloud** (base de données, auth, stockage images, server functions) — activé.
- **Paiement Mobile Money** : intégration via **FedaPay** (agrégateur béninois qui couvre MTN MoMo Bénin, Moov Money, cartes). Je créerai un endpoint serveur sécurisé qui appelle l'API FedaPay et un webhook public pour confirmer les paiements. Vous devrez fournir une **clé API FedaPay** (sandbox pour tester, live pour la prod) après l'enable.
- **Auth** : email/mot de passe + Google (par défaut Lovable Cloud).
- **Rôles** : `admin` / `customer` via table `user_roles` séparée + fonction `has_role` (sécurité contre escalade de privilèges).

## Modèle de données
- `profiles` (id → auth.users, full_name, phone, avatar_url)
- `user_roles` (user_id, role enum: admin/customer)
- `categories` (id, name, slug)
- `products` (id, name, slug, description, price_xof, image_url, stock, type: physical/digital, digital_file_url, category_id, is_active)
- `orders` (id, user_id, total_xof, status: pending/paid/failed/shipped/delivered, shipping_address, phone, payment_provider, payment_reference)
- `order_items` (order_id, product_id, quantity, unit_price_xof)

RLS strict : clients lisent/écrivent leurs propres commandes ; admins gèrent tout ; catalogue lisible par tous (anon inclus).

## Pages & fonctionnalités

**Public**
- `/` Accueil : hero, catégories vedettes, produits populaires.
- `/boutique` Catalogue avec recherche, filtres catégorie, tri prix.
- `/produit/$slug` Fiche produit + bouton "Ajouter au panier".
- `/panier` Panier (persisté localStorage + sync si connecté).
- `/checkout` Formulaire commande (adresse, téléphone MoMo) → redirection FedaPay → retour.
- `/commande/$id/confirmation` Page de confirmation.
- `/auth` Connexion / inscription.

**Client connecté** (`_authenticated/`)
- `/compte` Profil + historique des commandes + téléchargement produits numériques achetés.

**Admin** (`_authenticated/_admin/`)
- `/admin` Dashboard (CA, commandes récentes, stock bas).
- `/admin/produits` CRUD produits (upload image, fichier numérique).
- `/admin/categories` CRUD catégories.
- `/admin/commandes` Liste + mise à jour statut (préparation, expédié, livré).

## Design
Direction visuelle inspirée du commerce ouest-africain moderne : palette terre + or (#1A1F2C anthracite, #F4A261 ocre chaud, #E76F51 terracotta, #FEFAE0 ivoire, #2A9D8F vert profond pour accents). Typo **Outfit** (titres) + **Inter** (texte). Cartes produits avec coins arrondis 1rem, ombres douces, micro-animations au hover. Prix en **FCFA** partout. Mobile-first (votre viewport est 343px).

## Étapes de livraison
1. Activer Lovable Cloud, créer le schéma DB + RLS + rôles.
2. Système d'auth (email/Google) + page `/auth` + bootstrap admin.
3. Catalogue public + fiche produit + panier.
4. Checkout + intégration FedaPay (server function `create-payment` + route publique `/api/public/webhooks/fedapay`).
5. Espace client (commandes, téléchargements numériques).
6. Back-office admin complet.
7. Polish design, SEO, métadonnées.

## Notes
- Le paiement FedaPay fonctionnera en **sandbox** dès l'ajout de la clé de test, sans risque financier. Bascule live quand vous serez prêt.
- Les produits numériques seront livrés via URLs signées Lovable Cloud Storage (téléchargement réservé à l'acheteur).

Approuvez et je commence par l'activation de Cloud et le schéma de base de données.