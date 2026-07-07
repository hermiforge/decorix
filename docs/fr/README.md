# Documentation Decorix

Ce dossier est le guide d'utilisation narratif de Decorix : comment démarrer, comment
raisonner sur les concepts, et comment brancher chaque cible (formulaires, JSON
Schema, CLI). La référence exhaustive d'API reste dans le README de chaque package
(`packages/core/README.md`, `packages/cli/README.md`, `packages/adapters/*/README.md`)
— ce guide y renvoie plutôt que de la dupliquer.

Un site de documentation dédié (recherche, navigation) est prévu plus tard ; en
attendant, ces pages sont conçues pour rester lisibles directement sur GitHub.

*English version: [`docs/README.md`](../README.md).*

## Sommaire

1. [Démarrage rapide](./getting-started.md) — installation, premier modèle, première validation.
2. [Concepts fondamentaux](./core-concepts.md) — décorateurs vs builder, métadonnées, `ValidatorAdapter`.
3. [Guide de validation](./validation-guide.md) — contraintes natives, contraintes personnalisées, cross-field, async, groupes.
4. [Adapters de formulaires](./adapters.md) — quel package choisir selon votre framework.
5. [CLI `decorix`](./cli.md) — générer des artefacts (JSON Schema, Zod, configs de formulaire) depuis la ligne de commande.
6. [JSON Schema (export/import)](./json-schema.md) — interopérabilité avec des schémas standards.
7. [Dépannage](./troubleshooting.md) — erreurs courantes et leur cause.

Pour une vue d'ensemble des packages publiés, voir le [README racine](../../README.md#packages).
