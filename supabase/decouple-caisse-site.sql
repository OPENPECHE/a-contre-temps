-- ─────────────────────────────────────────────────────────────────────────────
-- Dédoublage « tablette caisse » / « site marché »
-- ─────────────────────────────────────────────────────────────────────────────
-- Jusqu'ici, la colonne on_market pilotait À LA FOIS :
--   • la TABLETTE CAISSE (caisse.html)         → reste on_market
--   • la page « commander au marché » du SITE  → passe à sell_market
-- Désormais on_market et sell_market sont INDÉPENDANTS (back-office).
--
-- Cette requête recopie l'état actuel pour NE RIEN FAIRE DISPARAÎTRE :
-- tout produit aujourd'hui au marché reste visible des deux côtés,
-- jusqu'à ce que tu décoches l'un ou l'autre dans le back-office.
UPDATE products SET sell_market = on_market WHERE sell_market IS NULL;

-- Vérif (optionnel) : produits caisse vs site marché
-- SELECT name, on_market AS tablette_caisse, sell_market AS site_marche
-- FROM products WHERE on_market OR sell_market ORDER BY name;
